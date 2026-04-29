// ============================================================
// AI App Builder Challenge — Backend Server
// Node.js + Express + @libsql/client (Turso / local SQLite)
// ============================================================

require('dotenv').config(); // load .env file if present

const express      = require('express');
const path         = require('path');
const { createClient } = require('@libsql/client');
const rateLimit    = require('express-rate-limit');

// Anthropic client — optional, requires ANTHROPIC_API_KEY env var
let anthropic = null;
try {
  const Anthropic = require('@anthropic-ai/sdk');
  if (process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic();
    console.log('✅ Anthropic AI connected — AI hints enabled.');
  } else {
    console.log('ℹ️  ANTHROPIC_API_KEY not set — AI hints will use static fallback.');
  }
} catch (_) {
  console.log('⚠️  @anthropic-ai/sdk not found — AI hints unavailable.');
}

const app     = express();
const PORT    = process.env.PORT || 3000;

// ── Database client — Turso in production, local file otherwise ──
const DB_URL  = process.env.TURSO_DATABASE_URL
  ? process.env.TURSO_DATABASE_URL                   // Turso cloud (persistent)
  : process.env.VERCEL
    ? 'file:/tmp/database.db'                         // Vercel /tmp fallback (ephemeral)
    : 'file:./database.db';                           // local development
const dbClient = createClient({
  url:       DB_URL,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined
});
console.log('🗄️  DB URL:', DB_URL.startsWith('libsql') ? DB_URL.replace(/:\/\/[^@]+@/, '://***@') : DB_URL);

app.use(express.json());

// ── Rate Limiting ──
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please slow down.' }
});
const hintLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 6, // max 6 AI hint requests per minute per IP
  message: { error: 'AI hint rate limit reached. Wait a moment.' }
});
const explainLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // max 30 explain requests per minute per IP (one per wrong answer)
  message: { error: 'Explain rate limit reached. Wait a moment.' }
});
const scoreLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // max 20 score saves per hour per IP
  message: { error: 'Too many score submissions. Try again later.' }
});
const learnLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15, // generous — cached after first call per day
  message: { error: 'Too many requests. Try again in a moment.' }
});
app.use('/api/', apiLimiter);

// ── Lazy-init middleware: ensures tables exist before any request ──
let _initPromise = null;
app.use(async (req, res, next) => {
  if (!_initPromise) _initPromise = initDb();
  try {
    await _initPromise;
  } catch (e) {
    console.error('DB init failed:', e);
    return res.status(500).json({ error: 'Database initialisation failed.' });
  }
  next();
});

// ── Run a SELECT and return all rows as plain JS objects ──
async function dbAll(sql, params = []) {
  const result = await dbClient.execute({ sql, args: params });
  return result.rows.map(row =>
    Object.fromEntries(result.columns.map((col, i) => [col, row[i]]))
  );
}

// ── Run a SELECT and return the first row (or null) ──
async function dbGet(sql, params = []) {
  const rows = await dbAll(sql, params);
  return rows[0] || null;
}

// ── Run an INSERT / UPDATE / DELETE; return last insert rowid ──
async function dbRun(sql, params = []) {
  const result = await dbClient.execute({ sql, args: params });
  return result.lastInsertRowid ? Number(result.lastInsertRowid) : null;
}

// ============================================================
// ADMIN AUTHENTICATION MIDDLEWARE (HTTP Basic Auth)
// ============================================================
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

function adminAuth(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="AI Challenge Admin"');
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const b64   = auth.slice(6);
  const plain = Buffer.from(b64, 'base64').toString('utf8');
  const [, pwd] = plain.split(':');
  if (pwd !== ADMIN_PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="AI Challenge Admin"');
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  next();
}

// ============================================================
// TABLE CREATION & MIGRATIONS
// ============================================================
async function createTables() {
  // Create tables with all columns upfront (idempotent)
  await dbClient.execute(`CREATE TABLE IF NOT EXISTS questions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    question_text  TEXT NOT NULL,
    option_a       TEXT NOT NULL,
    option_b       TEXT NOT NULL,
    option_c       TEXT NOT NULL,
    option_d       TEXT NOT NULL,
    correct_option TEXT NOT NULL,
    level          TEXT NOT NULL,
    difficulty     TEXT NOT NULL,
    explanation    TEXT NOT NULL,
    hint           TEXT NOT NULL,
    flag_count     INTEGER NOT NULL DEFAULT 0,
    status         TEXT NOT NULL DEFAULT 'approved'
  )`);

  await dbClient.execute(`CREATE TABLE IF NOT EXISTS scores (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name     TEXT NOT NULL,
    score           INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    accuracy        REAL NOT NULL,
    level           TEXT NOT NULL,
    difficulty      TEXT NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await dbClient.execute(`CREATE TABLE IF NOT EXISTS flagged_questions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    reason      TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Daily content cache — lessons and AI trends, one row per (date, type)
  await dbClient.execute(`CREATE TABLE IF NOT EXISTS daily_content (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    date       TEXT NOT NULL,
    type       TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, type)
  )`);

  // Schema migrations for tables that existed before these columns were added
  for (const migration of [
    'ALTER TABLE questions ADD COLUMN flag_count INTEGER NOT NULL DEFAULT 0',
    "ALTER TABLE questions ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'"
  ]) {
    try { await dbClient.execute(migration); } catch (_) { /* column exists, skip */ }
  }
}

// ============================================================
// SEED QUESTIONS — 225 total (15 combos × 15 questions each)
// ============================================================
async function seedQuestions() {
  const questions = [
    // ==================== LEVEL 1: AI FOUNDATIONS ====================

    // --- Level 1: Beginner ---
    ["What is the main goal of artificial intelligence?","To make machines perform tasks that usually require human intelligence","To make websites colorful","To delete data automatically","To replace electricity","A","AI Foundations","Beginner","AI helps machines perform tasks such as understanding language, recognizing images, and making predictions — things that normally need human thinking.","Think about machines doing tasks that normally need human thinking."],
    ["Which of the following is a real-world example of artificial intelligence?","Voice assistants like Siri or Alexa","A traditional calculator","A light switch","A keyboard","A","AI Foundations","Beginner","Voice assistants use natural language processing, a type of AI, to understand and respond to human speech.","Think about technology that understands your voice."],
    ["What does ML stand for in the field of AI?","Machine Learning","Manual Logic","Micro Language","Model Library","A","AI Foundations","Beginner","ML stands for Machine Learning — a subset of AI where systems learn patterns from data without being explicitly programmed for every task.","It's about machines that learn from data."],
    ["Which of the following is a subset of artificial intelligence?","Machine Learning","Web Design","Database Administration","Network Security","A","AI Foundations","Beginner","Machine Learning is a subset of AI that focuses on building systems that learn from data. AI is the broader field.","Think about the relationship between AI and one of its branches."],
    ["What does an AI model use to make predictions?","Patterns learned from training data","Random guesses","Human instructions for every single case","Pre-written rules for every possible situation","A","AI Foundations","Beginner","AI models learn patterns from training data and then use those patterns to make predictions on new, unseen data.","Think about what the model learns during training."],
    ["Which type of AI technique is most commonly used for image recognition?","Deep learning with convolutional neural networks","Simple spreadsheet formulas","Traditional SQL queries","Rule-based expert systems","A","AI Foundations","Beginner","Deep learning with convolutional neural networks (CNNs) excels at image recognition because they learn spatial hierarchies of features automatically from pixels.","Think about the AI technique that mimics how the visual cortex processes images."],
    ["What is the difference between narrow AI and general AI?","Narrow AI is designed for one specific task; general AI would handle any intellectual task like a human","Narrow AI is faster; general AI is slower","Narrow AI uses neural networks; general AI uses databases","Narrow AI is free; general AI requires payment","A","AI Foundations","Beginner","Narrow AI (also called weak AI) performs specific tasks — like chess or translation. General AI (AGI) would reason and learn across any domain like a human, and doesn't yet exist.","Think about whether an AI can do only one thing or everything."],
    ["Which of these is an example of supervised learning?","Training a model to detect spam using thousands of labeled spam/not-spam emails","Letting a robot explore a maze on its own","Grouping news articles into topics without any labels","An AI playing games against itself to improve","A","AI Foundations","Beginner","Supervised learning uses labeled examples to train the model. Spam detection with pre-labeled emails is a classic supervised learning task.","Supervised learning needs labeled examples — which option has them?"],
    ["What does 'training data' mean in machine learning?","The dataset used to teach a model the patterns it should learn","A set of rules written by programmers","The final test used to grade the model","Random numbers generated by the computer","A","AI Foundations","Beginner","Training data is the dataset the model learns from. It contains input examples (and labels in supervised learning) that teach the model the underlying patterns.","It's the data the model 'studies' before being tested."],
    ["Which best describes the relationship between deep learning and machine learning?","Deep learning is a specialized branch of machine learning that uses multi-layer neural networks","Machine learning is a branch of deep learning","They are completely unrelated techniques","Deep learning replaces machine learning entirely","A","AI Foundations","Beginner","Deep learning is a subset of machine learning, not a replacement. It specifically uses neural networks with many layers to learn complex representations from large datasets.","Think of deep learning as a specialized type within the broader machine learning family."],
    ["Which field gave birth to the concept of neural networks?","Neuroscience — specifically how biological neurons in the brain work","Computer networking","Database management","Web development","A","AI Foundations","Beginner","Artificial neural networks were inspired by the structure and function of biological neural networks in the brain, where neurons connect and signal each other.","Neural networks were modeled after what natural system?"],
    ["What type of output does a classification model produce?","A category label from a predefined set (e.g., 'spam' or 'not spam')","A continuous decimal number","A list of database records","An HTML webpage","A","AI Foundations","Beginner","Classification models output discrete categories or class labels. Examples: cat/dog, spam/not-spam, positive/negative sentiment.","The output is a named category, not a number."],
    ["Which of the following best describes 'inference' in machine learning?","Using a trained model to generate predictions on new input data","The process of collecting training data","Choosing which algorithm to use","Writing the code for the model","A","AI Foundations","Beginner","Inference is when a deployed, trained model takes new inputs and produces predictions. It's the 'using' phase, distinct from the 'training' phase.","Inference is what happens after training, when the model is actually used."],
    ["What is a 'dataset' in machine learning?","A structured collection of data examples used to train, validate, or test a model","A type of programming language","A website design template","A network firewall setting","A","AI Foundations","Beginner","A dataset is a collection of data points used in machine learning. It may be split into training, validation, and test sets for different phases of model development.","Think of it as the collection of examples the model works with."],
    ["Which of the following best describes reinforcement learning?","An agent learns by taking actions in an environment and receiving rewards or penalties","A model learns from labeled examples provided by humans","Data is grouped into clusters without any labels","Rules are manually written by domain experts","A","AI Foundations","Beginner","Reinforcement learning involves an agent that learns optimal behavior by interacting with an environment and receiving feedback as rewards (positive) or penalties (negative).","The model learns through trial and error, receiving rewards for good actions."],

    // --- Level 1: Intermediate ---
    ["You are building an AI system that groups customers by purchasing behavior without any predefined categories. What type of learning is this?","Unsupervised learning","Supervised learning","Manual classification","Rule-based filtering","A","AI Foundations","Intermediate","Unsupervised learning discovers patterns in data without labeled examples. Grouping (clustering) customers is a classic unsupervised task.","There are no predefined labels in this scenario."],
    ["A spam email filter learns from thousands of emails labeled as spam or not spam. What type of machine learning is this?","Supervised learning","Unsupervised learning","Reinforcement learning","Transfer learning","A","AI Foundations","Intermediate","Supervised learning uses labeled training data. The spam filter learns from emails that are already labeled as spam or not spam.","The emails are labeled — the model learns from those labels."],
    ["What is the key difference between AI and traditional programming?","AI learns rules from data; traditional programming follows explicit rules written by humans","Traditional programming is always faster than AI","AI cannot process numbers","Traditional programming uses neural networks","A","AI Foundations","Intermediate","Traditional programming requires developers to write explicit rules. AI systems learn patterns from data and build their own rules.","Think about who creates the rules in each approach."],
    ["Deep learning is a subset of which broader field?","Machine learning","Database management","Network administration","Web development","A","AI Foundations","Intermediate","Deep learning is a subset of machine learning that uses multi-layer neural networks to learn complex patterns from large datasets.","Deep learning uses neural networks — what bigger field does that belong to?"],
    ["Which best describes a neural network?","A system inspired by human brain neurons that processes information in connected layers","A database that stores network connection logs","A tool for designing websites","A type of Wi-Fi router","A","AI Foundations","Intermediate","Neural networks are computing systems loosely inspired by biological neurons, organized in input, hidden, and output layers to recognize patterns.","Think about what the human brain is made of."],
    ["What does 'gradient descent' do in neural network training?","Iteratively adjusts the model's weights to minimize the loss (prediction error)","Deletes neurons that perform poorly","Downloads more training data from the internet","Removes features with low importance","A","AI Foundations","Intermediate","Gradient descent is the optimization algorithm that computes the gradient of the loss function with respect to each weight, then moves weights in the direction that reduces loss.","Think of it as finding the lowest point in an error landscape by following the slope downward."],
    ["In the context of neural networks, what is an 'epoch'?","One complete pass through the entire training dataset during training","A single neuron in the network","A type of activation function","The final evaluation step after training","A","AI Foundations","Intermediate","An epoch is one full iteration over all training examples. Training typically involves many epochs so the model refines its weights through repeated exposure to the data.","How many times does the model see the full dataset in one epoch?"],
    ["What does the 'loss function' measure during model training?","How far the model's predictions are from the true answers — the error it tries to minimize","How fast the model can process data","The amount of memory the model consumes","The number of layers in the neural network","A","AI Foundations","Intermediate","The loss function quantifies the difference between the model's predictions and the correct labels. Training aims to minimize this loss through optimization.","It's the signal the model uses to understand how wrong it currently is."],
    ["Which activation function is most commonly used in the hidden layers of modern deep learning models?","ReLU (Rectified Linear Unit) — it outputs 0 for negative inputs and the input value for positive ones","Sigmoid — squashes output between 0 and 1","Hyperbolic tangent (tanh)","Linear (no transformation)","A","AI Foundations","Intermediate","ReLU is popular because it's simple, computationally efficient, and helps avoid the vanishing gradient problem that plagued older activations like sigmoid in deep networks.","This activation is zero for negative values and linear for positive values."],
    ["What is the vanishing gradient problem in deep neural networks?","Gradients become extremely small as they propagate back through many layers, preventing early layers from learning","The neural network runs out of GPU memory","Training data gradually disappears from storage","The model's weights become too large to compute","A","AI Foundations","Intermediate","In deep networks, gradients multiplied across many layers can shrink toward zero (using sigmoid/tanh activations), making it impossible for early layers to update their weights effectively.","What happens when a very small number is multiplied by itself many times?"],
    ["What is the purpose of a validation set during model training?","To monitor model performance on unseen data during training and guide hyperparameter tuning","To provide additional data for training after each epoch","To test the model after deployment in production","To store the trained model weights permanently","A","AI Foundations","Intermediate","The validation set is used during training to check how well the model generalizes. It helps detect overfitting and guides decisions about hyperparameters — without contaminating the test set.","It's separate from training data but used before the final test evaluation."],

    // --- Level 1: Advanced ---
    ["An AI model achieves 99% accuracy on training data but only 60% on test data. What is the most likely cause?","Overfitting — the model memorized training examples instead of learning general patterns","The test set is too small to be meaningful","The model has too few parameters","The training accuracy measurement is incorrect","A","AI Foundations","Advanced","When a model performs significantly better on training data than on unseen test data, it has memorized the training set rather than learning generalizable patterns — this is overfitting.","The model works too well on data it has already seen."],
    ["You need to build an AI system that learns to play chess by playing millions of games and receiving win/loss rewards. Which learning paradigm is most appropriate?","Reinforcement learning","Unsupervised clustering","Linear regression","Data cleaning pipelines","A","AI Foundations","Advanced","Reinforcement learning trains agents through rewards and penalties, making it ideal for game-playing and decision-making tasks where the system improves through trial and experience.","The system learns by receiving rewards for good actions."],
    ["A company uses a model trained on 2010–2020 data to predict 2025 customer behavior. Performance is poor. What concept best explains this?","Data drift — real-world patterns have changed since the model was trained","Overfitting to new data","Correct model deployment","Proper data cleaning","A","AI Foundations","Advanced","Data drift occurs when the statistical properties of real-world data change over time, causing model performance to degrade because the training distribution no longer matches current reality.","The world has changed significantly since the model was trained."],
    ["Which technique prevents a neural network from memorizing noise in training data by randomly deactivating neurons during training?","Dropout","Batch normalization","Data augmentation","Feature scaling","A","AI Foundations","Advanced","Dropout is a regularization technique that randomly sets some neuron outputs to zero during training, forcing the network to learn more robust representations that don't rely on any single neuron.","This technique randomly turns off some neurons during training."],
    ["In transfer learning, what is the primary advantage of using a pretrained model?","It already contains useful features learned from large datasets, requiring less data and training time for the new task","It completely eliminates the need for any fine-tuning","It always achieves 100% accuracy","It removes the need for a validation set","A","AI Foundations","Advanced","Pretrained models have learned general features from massive datasets. Transfer learning lets you apply these features to new tasks with much less data and training time.","The model has already learned from huge amounts of data before you use it."],
    ["What is the bias-variance tradeoff in machine learning?","High bias causes underfitting (model too simple); high variance causes overfitting (model too complex). Good models balance both.","Bias refers to unfair data; variance refers to model size","High bias always produces better test accuracy","Variance only matters for classification tasks","A","AI Foundations","Advanced","Bias is error from wrong assumptions (underfitting); variance is error from sensitivity to training data fluctuations (overfitting). The goal is a model complex enough to capture real patterns but not noise.","Think about the two failure modes: too simple vs. too memorized."],
    ["What is the purpose of L1 and L2 regularization in machine learning?","To penalize large weight values during training, reducing overfitting and improving generalization","To increase model complexity for better training accuracy","To speed up gradient descent convergence","To normalize input features to a similar scale","A","AI Foundations","Advanced","L1 (Lasso) and L2 (Ridge) regularization add penalty terms to the loss function based on weight magnitudes. This discourages the model from memorizing training data by keeping weights small.","Regularization adds a cost for having large weights — why would that help?"],
    ["What distinguishes a generative AI model from a discriminative model?","Generative models learn the joint probability distribution to produce new data samples; discriminative models learn boundaries between classes","Generative models only work with text; discriminative models only work with images","Generative models require labeled data; discriminative models do not","Generative models are always larger and slower","A","AI Foundations","Advanced","Generative models (GANs, VAEs, LLMs) can create new data by learning underlying distributions. Discriminative models (logistic regression, SVMs) learn decision boundaries to classify existing data.","Can the model CREATE new examples, or only tell them apart?"],
    ["What is the purpose of batch normalization in deep neural networks?","To normalize layer outputs during training, stabilizing and accelerating learning by reducing internal covariate shift","To split training data into smaller batches","To normalize the final model output predictions","To remove outliers from each batch of training data","A","AI Foundations","Advanced","Batch normalization standardizes the inputs to each layer, reducing internal covariate shift. This allows higher learning rates, acts as mild regularization, and generally speeds up training convergence.","It normalizes what goes INTO each layer, not just the input data."],
    ["What is the key mathematical operation performed by the attention mechanism in transformer models?","Computing weighted sums of value vectors based on query-key similarity scores, allowing the model to focus on relevant context","Convolving input sequences with learned filters","Recursively processing sequences one token at a time","Summing all input embeddings with equal weight","A","AI Foundations","Advanced","Attention computes similarity (dot product) between queries and keys, applies softmax to get weights, then computes weighted sums of values. This allows each position to attend to any other position regardless of distance.","Each output position gets to 'look at' and weight all input positions based on relevance."],

    // ==================== LEVEL 2: DATA PREPARATION ====================

    // --- Level 2: Beginner ---
    ["What is the first critical step in building any AI application?","Collecting relevant data","Deploying the model to production","Designing the user interface","Writing the API endpoints","A","Data Preparation","Beginner","Data collection is the foundation of any AI project. Without quality data, you cannot train a model that makes accurate predictions.","AI needs to learn from something before it can make predictions."],
    ["What does data cleaning involve?","Removing errors, duplicates, and missing values from a dataset","Deleting all data from the database","Making chart colors look nicer","Adding random values to fill gaps","A","Data Preparation","Beginner","Data cleaning ensures data quality by fixing or removing incorrect, incomplete, inconsistent, or duplicate records before training.","Think about making data accurate and consistent."],
    ["In machine learning, what is a 'feature'?","An input variable the model uses to learn patterns and make predictions","The final output the model produces","A type of neural network architecture","The name of the training algorithm","A","Data Preparation","Beginner","Features are the input variables or attributes of your data. For example, in a house price model, features include size, location, and number of rooms.","Features are what you feed into the model as input."],
    ["What is a 'label' in supervised machine learning?","The known correct output associated with each training example","A name tag attached to a dataset file","A programming code comment","A data visualization type","A","Data Preparation","Beginner","Labels are the known correct outputs for training examples. The model learns to predict these labels from the input features.","It's what you want the model to learn to predict."],
    ["Why is the quality of training data so important in machine learning?","Because the model learns patterns from training data — poor data leads to poor predictions","It is only used for displaying results on screen","It controls the user interface design","It replaces the need for a backend server","A","Data Preparation","Beginner","A model's performance is directly determined by the quality and quantity of training data. The popular phrase is: 'Garbage in, garbage out.'","The model learns exactly what the data teaches it."],
    ["What does 'structured data' mean in the context of machine learning?","Data organized in rows and columns with defined types, like a spreadsheet or database table","Data without any organization or format","Images and audio files","Handwritten notes scanned to PDF","A","Data Preparation","Beginner","Structured data follows a predefined schema — rows are records, columns are fields. It's easy to query and process. Examples: CSV files, SQL tables, Excel spreadsheets.","Think of data that fits neatly into a table with rows and columns."],
    ["What is an 'outlier' in a dataset?","A data point that falls far outside the typical range of other values in the dataset","A duplicate entry in the database","A missing value that needs to be filled","The most common value in the dataset","A","Data Preparation","Beginner","Outliers are extreme values that deviate significantly from other data points. They can be caused by errors or rare events, and can distort model training if not handled properly.","It's the data point that doesn't fit with the rest of the values."],
    ["Which of the following is an example of categorical data?","A column containing values like 'Red', 'Green', 'Blue' representing product colors","A column with customer ages like 25, 30, 45","A column with sales amounts like 100.50, 200.75","A column with timestamps","A","Data Preparation","Beginner","Categorical data represents groups or categories. Examples: colors, countries, gender, product type. It's distinct from numerical data which represents measurable quantities.","Think about data that names a category rather than measures a quantity."],
    ["What is the purpose of splitting data into a training set and a test set?","To train the model on one portion and evaluate its real-world performance on a completely unseen portion","To make the dataset smaller and easier to store","To create two identical copies of the data","To separate good data from bad data","A","Data Preparation","Beginner","Splitting prevents the model from being evaluated on data it trained on. The test set simulates truly new data, giving an honest measure of how well the model will perform in production.","If the model sees all data during training, how could you honestly evaluate it?"],
    ["In the context of data preparation, what does 'EDA' stand for?","Exploratory Data Analysis — visually and statistically examining data before modeling","Extended Data Aggregation","External Data Access","Enhanced Database Algorithm","A","Data Preparation","Beginner","EDA (Exploratory Data Analysis) involves summarizing datasets, visualizing distributions, finding correlations, and detecting anomalies before building models. It guides preprocessing decisions.","EDA is what you do before modeling to truly understand your data."],
    ["What problem occurs when two features in your dataset are very strongly correlated with each other?","Multicollinearity — it can make model coefficients unstable and hard to interpret","The model trains faster due to redundancy","Missing values are introduced automatically","The test accuracy improves significantly","A","Data Preparation","Beginner","Multicollinearity happens when features are highly correlated, providing redundant information. In linear models this can inflate standard errors and make individual feature effects hard to isolate.","When two features say almost the same thing, what problem might arise?"],
    ["What does 'data imputation' mean?","Filling in missing values in a dataset using techniques like mean, median, or prediction","Permanently deleting all missing rows from a dataset","Generating entirely new synthetic records","Sorting data alphabetically or numerically","A","Data Preparation","Beginner","Imputation fills missing values to preserve as many training examples as possible. Common methods include replacing with mean/median (for numbers) or mode/most-frequent (for categories).","It's about filling gaps rather than deleting incomplete records."],
    ["Which tool is most commonly used by data scientists for exploratory data analysis in Python?","Pandas (for tabular data) combined with Matplotlib or Seaborn (for visualization)","Microsoft Word","HTML and CSS","Java Swing","A","Data Preparation","Beginner","Pandas provides powerful data manipulation and analysis for tabular data, while Matplotlib and Seaborn enable rich visualizations. Together they form the standard Python EDA toolkit.","What Python library is famous for working with dataframes and tables?"],
    ["What is 'raw data' in the context of a machine learning pipeline?","Unprocessed data in its original form, collected before any cleaning or transformation","Fully cleaned and feature-engineered data ready for modeling","Data that has been normalized and scaled","The final predictions output by a trained model","A","Data Preparation","Beginner","Raw data is data in its original collected state — before cleaning, transformation, or feature engineering. It usually contains noise, inconsistencies, and formatting issues that need to be addressed.","'Raw' means it hasn't been processed yet — straight from the source."],
    ["What does 'data annotation' mean in machine learning?","Adding labels or tags to raw data so it can be used for supervised learning","Removing duplicate records from a dataset","Converting data from one file format to another","Encrypting sensitive data before storage","A","Data Preparation","Beginner","Data annotation (or labeling) is the process of manually tagging data with correct answers so supervised models can learn. For example, drawing bounding boxes around objects in images.","Annotation gives data the labels that supervised learning needs to function."],

    // --- Level 2: Intermediate ---
    ["You are preparing data for a house price model. The 'house condition' column contains text values: 'old', 'new', 'very old'. What preprocessing step is required?","Encode the categorical values into numbers (e.g., label encoding or one-hot encoding)","Delete the column entirely","Copy the column twice","Add a random number to each text value","A","Data Preparation","Intermediate","Most ML models require numerical inputs. Categorical text values must be encoded using techniques like label encoding (0, 1, 2) or one-hot encoding (binary columns).","Machines need numbers, not words."],
    ["What is the primary purpose of splitting data into training and test sets?","To evaluate how well the model performs on unseen data it was not trained on","To double the amount of data available for training","To make the overall dataset smaller","To improve the look of data visualizations","A","Data Preparation","Intermediate","The test set acts as completely unseen data to evaluate whether the model generalizes to new examples. Training on all data would give misleadingly high performance metrics.","You want to know how the model does on data it has never seen before."],
    ["A dataset has 30% of values missing in the 'age' column. What is the best approach?","Fill missing values with the median age (imputation) or remove those rows — depending on impact","Delete the entire dataset and start over","Replace all missing ages with zero","Ignore missing values completely","A","Data Preparation","Intermediate","Missing values can be handled by imputation (filling with mean, median, or mode) or by removing rows. The right choice depends on how many values are missing and the column's importance.","Think about how to fill gaps without losing too much information."],
    ["What is feature engineering?","Creating new, more informative features from existing data to improve model performance","Simply deleting unnecessary columns","Designing the visual features of a website","Writing Python utility functions","A","Data Preparation","Intermediate","Feature engineering transforms raw data into meaningful inputs that help models learn better patterns. For example, creating 'age_squared' or combining features can dramatically improve accuracy.","You're creating new useful information from existing raw data."],
    ["Which problem occurs when your training dataset contains mostly examples of one class with very few examples of another?","Class imbalance — causing the model to be biased toward the majority class","Data overflow in memory","Feature explosion","Label leakage from the test set","A","Data Preparation","Intermediate","Class imbalance means one category dominates. Models trained on imbalanced data tend to ignore the minority class because predicting the majority class is still highly 'accurate.'","One type of example appears much more often than the other."],
    ["What is the difference between MinMax scaling and StandardScaler (Z-score normalization)?","MinMax scales to a fixed range [0,1]; StandardScaler centers data at mean 0 with standard deviation 1","They are identical operations with different names","MinMax is for categorical data; StandardScaler is for numerical data","StandardScaler only works with images","A","Data Preparation","Intermediate","MinMax scaling maps values to [0, 1]. StandardScaler removes the mean and divides by standard deviation, producing a zero-mean unit-variance distribution. Both normalize scale but differently.","Think about what range each technique produces and what it assumes about the distribution."],
    ["What is SMOTE used for in machine learning data preparation?","Synthetically generating new minority class examples to address class imbalance","Removing outliers from a dataset automatically","Performing dimensionality reduction on features","Compressing large datasets to save storage","A","Data Preparation","Intermediate","SMOTE (Synthetic Minority Over-sampling Technique) creates synthetic examples of the minority class by interpolating between real minority samples, helping classifiers learn the minority class better.","SMOTE creates new synthetic examples — for which class would that be useful?"],
    ["You have a date column formatted as '2024-03-15'. What feature engineering step extracts the most value?","Extract year, month, day, day-of-week, and is_weekend as separate numerical features","Keep the date as a raw string — models understand dates natively","Convert all dates to their Unix timestamp as a single feature","Delete date columns since they are not useful","A","Data Preparation","Intermediate","Raw date strings can't be processed by most models. Extracting components (month, day-of-week, is_weekend) creates meaningful features — seasonality and day patterns often have strong predictive power.","Breaking a date into parts reveals patterns that a raw string hides."],
    ["What does PCA (Principal Component Analysis) do to a high-dimensional dataset?","Reduces dimensions by finding new axes (principal components) that capture maximum variance","Adds new features based on random combinations","Deletes features with the lowest mean values","Converts numerical features into categorical ones","A","Data Preparation","Intermediate","PCA projects data onto fewer orthogonal axes that explain the most variance. This reduces dimensionality, speeds up training, and can reduce overfitting — at the cost of some interpretability.","PCA finds the directions of greatest variance and projects data onto them."],
    ["What is the 'train-validation-test split' and why are three sets needed?","Train: learn weights. Validation: tune hyperparameters without biasing test. Test: final unbiased evaluation.","All three sets are used together during training for faster convergence","Validation and test sets are interchangeable — only one is needed","Train and validation are merged after tuning to provide more test data","A","Data Preparation","Intermediate","Using the test set for hyperparameter tuning 'contaminates' it, making final evaluation optimistic. The validation set takes this role. The test set remains pristine for a single honest final evaluation.","Why would using just two sets cause the final evaluation to be misleadingly optimistic?"],

    // --- Level 2: Advanced ---
    ["You build a fraud detection model. Only 0.1% of transactions are fraudulent. Your model predicts 'not fraud' for everything and achieves 99.9% accuracy. What is the fundamental problem?","The accuracy metric is completely misleading due to severe class imbalance — the model catches zero fraud","The model is perfectly trained and ready for production","The test set is too large","The features need normalization first","A","Data Preparation","Advanced","With 0.1% fraud rate, always predicting 'not fraud' gives 99.9% accuracy but catches zero actual fraud cases. Use precision, recall, and F1-score for imbalanced datasets instead.","High accuracy alone can be completely misleading for imbalanced classes."],
    ["During data collection for a hiring AI, you discover historical data reflects past human biases. What is the consequence of training on this data?","The model will learn and potentially amplify those same historical biases","The model will automatically detect and correct the biases","The model will improve hiring fairness automatically","The data can still be used without any modification","A","Data Preparation","Advanced","AI models learn patterns from data — including unfair patterns. Training on biased historical data causes the model to reproduce those biases at scale, automating discrimination.","The model learns exactly what the data shows it, including unfair patterns."],
    ["What does data normalization accomplish in machine learning?","Scales features to a similar range so no single large-valued feature dominates model training","Permanently removes all outliers from the dataset","Converts text data to audio format","Adds more rows to artificially expand the dataset","A","Data Preparation","Advanced","Normalization scales numerical features to a common range (e.g., 0–1). Without it, features with large values (like salary in thousands) would dominate over features with small values (like age).","Think about making all numbers comparable in scale."],
    ["What is data leakage in machine learning?","When information from the test/future data accidentally influences the training process, producing unrealistically optimistic results","When data is shared publicly on the internet","When the database connection drops unexpectedly","When the model has too few training features","A","Data Preparation","Advanced","Data leakage occurs when test-set or future data information contaminates training, making evaluation results appear far better than they'll be in production.","Information that should be hidden is being used during training."],
    ["You have 10,000 training rows but after feature engineering you now have 5,000 features. What problem might occur?","The curse of dimensionality — too many features relative to samples causes poor generalization","The model will automatically improve due to more information","Training will become significantly faster","Test accuracy will reliably increase","A","Data Preparation","Advanced","The curse of dimensionality means that when features far outnumber samples, models struggle to find real patterns among the noise and overfit easily. Feature selection or dimensionality reduction is needed.","Too many features with too few examples creates serious problems."],
    ["What is the difference between feature selection and dimensionality reduction?","Feature selection picks a subset of original features; dimensionality reduction creates new features (like PCA components) from combinations of originals","They are the same technique with different names","Feature selection only works for classification; PCA only for regression","Dimensionality reduction always improves accuracy; feature selection sometimes hurts it","A","Data Preparation","Advanced","Feature selection (filter/wrapper methods) keeps original interpretable features. Dimensionality reduction (PCA, t-SNE) creates new latent features. Both reduce dimensions but with different tradeoffs.","Does the result contain the original features, or entirely new ones?"],
    ["You are building a model to predict customer churn. You realize the 'days_since_last_purchase' feature contains many zeros for customers who have never purchased. What is the right approach?","Create a binary 'has_purchased' feature and use imputation or a separate value for the zero-purchase group","Delete all zero-value rows from the dataset","Replace zeros with the column mean","Ignore the issue — zeros are valid data","A","Data Preparation","Advanced","Zeros meaning 'never purchased' are structurally different from zeros meaning 'purchased today.' A binary indicator separates these groups, allowing the model to distinguish their different patterns.","Zeros with different meanings need to be separated — how would you distinguish them?"],
    ["What is target encoding and when should you use it carefully?","Replacing a categorical variable with the mean target value for each category — requires cross-validation to avoid leakage","A simple label encoding of categorical values","A method of normalizing the target variable","Encoding that always improves model performance with no downsides","A","Data Preparation","Advanced","Target encoding replaces categories with their mean target value (e.g., 'Paris' → average house price in Paris). Without cross-validation, it leaks target information from the training set into the features.","This encoding uses the target variable — why is that potentially problematic?"],
    ["A dataset of 1 million rows is too large to fit in RAM. What are the best strategies to handle this?","Use chunked/batch processing, data generators, or out-of-core learning algorithms that process subsets at a time","Buy more RAM — it's the only solution","Delete rows randomly until it fits in memory","Only train on the first 10,000 rows","A","Data Preparation","Advanced","Large datasets require strategies like chunked processing (pandas read_csv chunksize), Dask for out-of-memory computation, or mini-batch learning algorithms that process data in small pieces.","How do you work with data that won't fit in memory all at once?"],
    ["What is 'concept drift' and how does it differ from 'data drift'?","Data drift = input feature distributions change; concept drift = the relationship between features and target changes","They are the same phenomenon described differently","Data drift only affects unsupervised models; concept drift affects supervised models","Concept drift refers to changing business requirements, not data","A","Data Preparation","Advanced","Data drift means input statistics change (e.g., different age distribution). Concept drift means the pattern you're predicting changes (e.g., what predicts churn changes). Concept drift is harder to detect and more damaging.","One is about changing inputs; the other is about the changing meaning of those inputs."],

    // ==================== LEVEL 3: MODEL BUILDING ====================

    // --- Level 3: Beginner ---
    ["What is model training in machine learning?","Teaching an AI model to recognize patterns by showing it labeled data repeatedly","Downloading a pre-built website template","Installing new software on a server","Writing SQL database queries","A","Model Building","Beginner","Training a model means feeding it data and adjusting its internal parameters so it learns patterns that allow accurate predictions on new data.","Training is how the model learns — similar to how you study for a test."],
    ["What is a classification problem in machine learning?","Predicting which category or class an input belongs to","Predicting a continuous numerical value","Cleaning and organizing a dataset","Connecting two database tables","A","Model Building","Beginner","Classification assigns inputs to categories. Examples: spam detection (spam/not spam), image recognition (cat/dog/car), or sentiment analysis (positive/negative).","The output is a category label, not a number."],
    ["What is a regression problem in machine learning?","Predicting a continuous numerical value","Sorting items into categories","Connecting two separate databases","Designing the model's user interface","A","Model Building","Beginner","Regression predicts continuous values. Examples: predicting house prices, temperature tomorrow, or a person's expected salary.","The output is a number on a continuous scale, not a category."],
    ["What role does an algorithm play in machine learning?","It defines the mathematical method used to learn patterns from data","It automatically draws charts for the dataset","It creates the user interface design","It manages the database connections","A","Model Building","Beginner","A machine learning algorithm defines the mathematical process that adjusts the model's parameters to minimize prediction errors during training.","Think of it as the learning method or recipe the model follows."],
    ["What is a prediction in the context of a trained machine learning model?","The output a trained model produces when given new input data","A random guess made before any data is seen","A type of database query","An animation shown on the website","A","Model Building","Beginner","After training, a model uses its learned patterns to produce a prediction — its best estimate of the output for new, unseen inputs.","It's what the model outputs when you give it new data to evaluate."],
    ["What is a decision tree model?","A tree-structured model that makes decisions by splitting data based on feature values at each node","A hierarchical file system structure","A diagram showing business org charts","A technique for sorting algorithms","A","Model Building","Beginner","Decision trees split data step by step based on feature thresholds, forming branches that lead to leaf nodes with predictions. They are intuitive and easy to visualize.","Think about a flowchart that asks yes/no questions to reach a decision."],
    ["What does 'model accuracy' measure?","The percentage of predictions the model got correct out of all predictions made","The speed at which the model makes predictions","The amount of training data used","The memory the model consumes during inference","A","Model Building","Beginner","Accuracy = correct predictions / total predictions × 100%. It's a simple and intuitive metric, though misleading when classes are imbalanced.","It counts what fraction of all guesses were right."],
    ["What is 'underfitting' in machine learning?","When a model is too simple to capture the underlying patterns in data, performing poorly on both training and test data","When a model memorizes training data too well","When training data is too large to process","When the model architecture has too many layers","A","Model Building","Beginner","Underfitting occurs when the model lacks complexity to represent the true relationship. It produces high error on both training and test sets — the model hasn't learned enough.","The model is too simple — it can't even learn the training data well."],
    ["What is 'overfitting' in machine learning?","When a model learns training data too specifically, including noise, causing poor performance on new data","When the model is too simple to learn patterns","When training is stopped too early","When the model is deployed without testing","A","Model Building","Beginner","Overfitting occurs when the model captures noise and specific details of training data rather than general patterns, causing it to fail on new unseen data.","The model memorized training examples instead of learning general rules."],
    ["Which metric is most appropriate for evaluating a regression model?","Mean Absolute Error (MAE) or Root Mean Squared Error (RMSE) — measuring distance between predictions and true values","Accuracy — the percentage of correct predictions","Precision and recall — measuring false positive/negative rates","F1 Score — the harmonic mean of precision and recall","A","Model Building","Beginner","Regression models output continuous values, so error distance metrics like MAE or RMSE are appropriate. Accuracy, precision, and recall are classification metrics that don't apply here.","Regression outputs numbers — how would you measure how far off a number guess is?"],
    ["What is a hyperparameter in machine learning?","A parameter set before training (like learning rate or number of trees) that controls how the model trains — not learned from data","A weight inside the neural network updated during training","A feature engineered from the training data","A type of activation function","A","Model Building","Beginner","Hyperparameters are configuration choices made before training (e.g., learning rate, max depth, number of epochs). They're distinct from model parameters (weights and biases) that are learned from data.","You set these before training begins — the model doesn't learn them."],
    ["What does 'model evaluation' mean?","Testing a trained model on held-out data to measure its real-world performance using appropriate metrics","Designing the visual interface for the model","Choosing the right features before training","Writing documentation for the model code","A","Model Building","Beginner","Model evaluation uses test data (never seen during training) and appropriate metrics (accuracy, F1, MAE, etc.) to objectively assess whether the model meets performance requirements.","After training, you need to measure how good the model actually is."],
    ["What is random forest?","An ensemble method that builds many decision trees on random data subsets and averages their predictions","A single very deep decision tree","A data visualization technique","A database indexing method","A","Model Building","Beginner","Random forest creates many trees using bootstrap sampling and random feature selection, then aggregates predictions. This reduces variance compared to a single tree and improves generalization.","It's an ensemble — many trees working together, not just one."],
    ["What is logistic regression used for?","Predicting binary classification outcomes (yes/no, true/false) despite the word 'regression' in its name","Predicting continuous numerical values like house prices","Grouping similar data points into clusters","Reducing the number of input features","A","Model Building","Beginner","Despite the name, logistic regression is a classification algorithm. It models the probability that an input belongs to a class using the sigmoid function, outputting values between 0 and 1.","Don't be fooled by 'regression' in the name — it outputs categories."],
    ["What is k-nearest neighbors (KNN)?","A model that classifies new points based on the majority class among their k closest training examples","A method for reducing feature dimensions","A technique for cleaning missing values","An optimization algorithm for neural networks","A","Model Building","Beginner","KNN predicts by finding the k most similar training examples (neighbors) to a new input and voting among their labels. It's intuitive but computationally expensive on large datasets.","This model literally looks for the closest examples it has seen before."],

    // --- Level 3: Intermediate ---
    ["A model achieves 95% accuracy on training data but only 62% on test data. What is the best corrective action?","Apply regularization or reduce model complexity to address overfitting","Delete the test data and retrain","Deploy the model immediately without changes","Remove all test data from evaluation","A","Model Building","Intermediate","The large gap between training and test accuracy clearly indicates overfitting. Regularization techniques (L1/L2 penalty, dropout) or simpler models reduce overfitting.","The model memorized training data but can't generalize to new data."],
    ["Which metric measures what percentage of positive predictions were actually correct?","Precision","Recall","Overall accuracy","Training loss","A","Model Building","Intermediate","Precision = True Positives / (True Positives + False Positives). It answers: 'Of all the cases the model predicted as positive, how many were actually positive?'","How precise were the model's positive predictions?"],
    ["Which metric measures what percentage of actual positives the model successfully identified?","Recall (also called sensitivity)","Precision","F1 Score","Overall accuracy","A","Model Building","Intermediate","Recall = True Positives / (True Positives + False Negatives). It answers: 'Of all the real positive cases, how many did the model catch?' Critical in disease detection.","How many of the real positives did the model find?"],
    ["What is cross-validation used for in machine learning?","Evaluating model performance more reliably by testing on multiple different data splits","Connecting the model to an external database","Deploying the model to a production server","Creating the model's user interface automatically","A","Model Building","Intermediate","Cross-validation splits data into k folds, trains on k-1 folds, and tests on the remaining fold — repeating this for each fold. This provides a more reliable performance estimate.","It tests the model on multiple different portions of the data, not just one split."],
    ["A house price model consistently predicts values $50,000 too high for all houses. What issue does this represent?","High bias — the model has a systematic error and has not learned the correct relationship","Severe overfitting to training data","Data leakage from the test set","Underfitting due to too many features","A","Model Building","Intermediate","Systematic, consistent errors in one direction indicate high bias — the model is missing a real pattern in the data. The model is underfit or using the wrong approach.","The errors are consistent and always in the same direction — that suggests a systematic problem."],
    ["What does the F1 score measure in binary classification?","The harmonic mean of precision and recall — balancing both into a single metric","Only the recall of the positive class","The percentage of correctly classified examples","The difference between training and test accuracy","A","Model Building","Intermediate","F1 = 2 × (Precision × Recall) / (Precision + Recall). It's useful when you need a balance between precision and recall, especially with imbalanced classes where accuracy is misleading.","F1 combines two metrics — which two does it balance?"],
    ["What is 'hyperparameter tuning' and why does it matter?","Searching for the best configuration values (learning rate, tree depth, etc.) that maximize model performance on the validation set","Adjusting the model weights during training","Cleaning the training data before model fitting","Selecting the input features for the model","A","Model Building","Intermediate","Hyperparameters control the learning process and model structure. Choosing them well (via grid search, random search, or Bayesian optimization) can significantly improve validation and test performance.","You're searching for the best 'settings' before you even start training."],
    ["What is an ensemble model?","A model that combines the predictions of multiple individual models to improve overall performance","A single very large neural network","A model trained on a very large dataset","A model that uses only one type of algorithm","A","Model Building","Intermediate","Ensemble methods combine multiple models (trees, neural networks, etc.) through voting, averaging, or stacking. The combined prediction typically outperforms any individual model.","Think of it as using a committee of models rather than just one."],
    ["What is the ROC-AUC metric used for?","Evaluating classification model performance across all classification thresholds — AUC near 1.0 means excellent discrimination","Measuring the mean error in regression predictions","Counting the number of training epochs needed","Measuring the model's inference speed in milliseconds","A","Model Building","Intermediate","ROC (Receiver Operating Characteristic) curves plot true positive rate vs false positive rate at all thresholds. AUC (Area Under Curve) summarizes this into one number — 0.5 is random, 1.0 is perfect.","AUC measures how well the model can distinguish between classes across all thresholds."],
    ["What is 'gradient boosting' and how does it differ from random forest?","Gradient boosting builds trees sequentially, each correcting previous errors; random forest builds trees independently in parallel","They are the same algorithm with different names","Random forest is always more accurate than gradient boosting","Gradient boosting only works for regression, not classification","A","Model Building","Intermediate","Gradient boosting (XGBoost, LightGBM) trains trees sequentially where each tree focuses on residual errors of predecessors. Random Forest trains independent trees and averages, leading to different bias-variance tradeoffs.","The key word is 'sequential' — trees are not independent in one of these methods."],

    // --- Level 3: Advanced ---
    ["You must choose between a complex neural network (more accurate) and a logistic regression (less accurate but explainable) for a medical diagnosis system. What is the key trade-off?","Accuracy vs. interpretability — medical contexts often require explainable decisions doctors can trust and act on","Training speed vs. memory consumption","Dataset size vs. model complexity","Deployment cost vs. inference time only","A","Model Building","Advanced","In high-stakes domains like medicine, explainability is critical. Doctors must understand model reasoning to trust and act on decisions. A less accurate but interpretable model may be preferable.","Think about what doctors need to trust and act on model outputs safely."],
    ["A cancer detection classifier has precision of 0.9 but recall of 0.4. In this application, which metric is most important to improve?","Recall — missing actual cancer cases (false negatives) is far more dangerous than false alarms","Precision — false alarms are the most costly outcome","Overall accuracy — it captures the full picture","F1 Score — balance is always the right approach","A","Model Building","Advanced","In cancer detection, a false negative (missing real cancer) can be fatal. Low recall of 0.4 means the model misses 60% of real cancer cases — this must be improved urgently.","Think about the cost of failing to detect a real positive case."],
    ["When would you prefer an ensemble method like Random Forest over a single decision tree?","When you need to reduce variance and improve generalization by combining many diverse models","When you have fewer than 100 training samples","When interpretability is the single most important requirement","When real-time inference speed is the absolute top priority","A","Model Building","Advanced","Random Forest combines many trees trained on random data subsets, reducing variance through averaging. The result is more robust and generalizes much better than any single tree.","Many weak models can combine to be stronger than one complex model."],
    ["Your model's training loss has completely plateaued. Which technique would most likely help the model continue improving?","Learning rate scheduling — reduce the learning rate so the optimizer can find finer improvements","Simply add more training epochs at the exact same learning rate","Remove all dropout and regularization layers","Significantly increase the batch size","A","Model Building","Advanced","When training loss plateaus, the learning rate is often too large to escape a flat region. Reducing the learning rate via scheduling helps the optimizer take smaller, more precise steps.","The model's steps might be too large to navigate toward a better solution."],
    ["What is the purpose of a validation set that is completely separate from both training and test sets?","To tune hyperparameters during development without contaminating the final unbiased test evaluation","To increase the total dataset size available for training","To verify the database connection is working correctly","To train a completely separate secondary model","A","Model Building","Advanced","The validation set guides hyperparameter decisions during development. If you use the test set for tuning, you contaminate it — final test evaluation will be biased and overly optimistic.","You need a dataset for making model decisions that isn't the sacred final test set."],
    ["What is stacking (stacked generalization) in ensemble learning?","Training a meta-model on predictions from multiple base models to learn how best to combine them","Simply averaging predictions from all base models","Training base models one after another on the same data","Randomly selecting one base model for each prediction","A","Model Building","Advanced","Stacking uses base model predictions as features for a meta-learner. The meta-learner discovers which base models are reliable in which situations, often outperforming simple averaging or voting.","A second model learns how to best combine the first-level models' predictions."],
    ["You need to train a model when only 500 labeled examples exist but millions of unlabeled examples are available. What is the most appropriate strategy?","Semi-supervised learning — use labeled data for supervision and unlabeled data for learning representations","Supervised learning on only the 500 labeled examples","Collect no unlabeled data as it provides no value","Use 500 examples but train for thousands of epochs","A","Model Building","Advanced","Semi-supervised learning combines labeled and unlabeled data. The model uses labeled examples for supervision while learning patterns from unlabeled data, often dramatically improving performance with scarce labels.","How do you use millions of unlabeled examples when you have very few labeled ones?"],
    ["What is the 'no free lunch' theorem in machine learning?","No single algorithm performs best across all possible problems — algorithm choice should be guided by the specific data and task","Neural networks always outperform all other algorithms","More data always beats a better algorithm","Larger models always generalize better than smaller ones","A","Model Building","Advanced","The No Free Lunch theorem states that averaged over all possible problems, no algorithm is universally superior. This motivates empirical comparison of algorithms on specific datasets rather than blind defaults.","There is no universally 'best' algorithm — why not?"],
    ["What is Bayesian hyperparameter optimization and why is it more efficient than grid search?","Bayesian optimization builds a probabilistic model of hyperparameter performance, focusing evaluations on promising regions rather than exhaustively testing all combinations","Bayesian optimization tests every possible hyperparameter combination systematically","Grid search is always faster because it parallelizes better","Bayesian optimization only works for neural networks","A","Model Building","Advanced","Bayesian optimization uses a surrogate model (usually Gaussian Process) to predict which untried hyperparameter combinations will perform well, intelligently selecting the next evaluation. Grid search wastes time on clearly bad regions.","Bayesian optimization is 'smart' about which combinations to try next — how?"],
    ["What problem does batch normalization solve in very deep neural networks?","Internal covariate shift — normalizing layer activations prevents the distribution of inputs to each layer from changing drastically during training","It prevents gradient explosion by clipping gradients","It reduces the number of parameters in the network","It eliminates the need for dropout regularization","A","Model Building","Advanced","Internal covariate shift means layer input distributions change as earlier layer weights update. BatchNorm normalizes these, allowing higher learning rates, faster convergence, and acting as mild regularization.","What distribution problem in deep networks does BatchNorm directly address?"],

    // ==================== LEVEL 4: AI APP DEVELOPMENT ====================

    // --- Level 4: Beginner ---
    ["What is an API in the context of AI applications?","A set of rules allowing different software components to communicate with each other","A type of database management system","A neural network architecture design","A visual interface design tool","A","AI App Development","Beginner","An API (Application Programming Interface) defines how software components interact. AI APIs let applications send data to a model and receive predictions in return.","Think about how two software systems talk to each other."],
    ["What is the primary role of the backend in an AI application?","Processing requests, running AI models, and managing data storage","Only displaying the visual user interface to the user","Connecting the app to social media platforms exclusively","Handling only visual and design-related tasks","A","AI App Development","Beginner","The backend handles business logic, connects to AI models or services, processes data, and manages databases — it's the core processing layer hidden from users.","The backend is the server-side logic engine."],
    ["What is the role of the frontend in an AI application?","The user-facing interface where users interact with the application","The server that processes and runs AI models","The database that stores prediction results","The algorithm inside the model that makes predictions","A","AI App Development","Beginner","The frontend is what users see and interact with — built with HTML, CSS, and JavaScript. It sends user inputs to the backend and displays AI model results.","It's what the user sees and interacts with on their screen."],
    ["What is a REST API?","An architectural style for web services using HTTP methods like GET, POST, PUT, and DELETE","A specific type of machine learning model","A database table structure pattern","A CSS styling framework","A","AI App Development","Beginner","REST (Representational State Transfer) uses standard HTTP methods. GET retrieves data, POST creates data, PUT updates data, and DELETE removes data — the foundation of most web APIs.","It uses HTTP methods like GET and POST to communicate between systems."],
    ["In an AI chatbot application, what does the user's message become when sent to the language model?","A prompt that the model processes to generate a response","A permanent database record","A CSS style rule","A network packet header","A","AI App Development","Beginner","In LLM-based apps, user input becomes a prompt. The model processes the prompt and generates a response based on patterns learned during its training.","The user's message tells the AI what to respond to."],
    ["What is JSON and why is it commonly used in AI application APIs?","A lightweight text format for structuring data that is easy for both humans to read and machines to parse","A programming language for writing AI models","A type of database storage engine","A CSS styling methodology","A","AI App Development","Beginner","JSON (JavaScript Object Notation) is the standard data format for REST APIs. Its key-value structure maps naturally to objects in all major programming languages, making it easy to serialize and deserialize.","APIs need a standard way to send structured data — what format is universally supported?"],
    ["What is a webhook in the context of AI applications?","An HTTP callback that allows a server to push data to your app automatically when an event occurs","A type of neural network hook layer","A method for database backup","A frontend animation trigger","A","AI App Development","Beginner","Webhooks let services notify your app of events in real time by sending HTTP POST requests to your endpoint. Useful for async AI processing — e.g., getting notified when a batch AI job finishes.","A webhook 'calls back' to your app when something happens — it's the opposite of polling."],
    ["In an AI app, what is the purpose of environment variables like ANTHROPIC_API_KEY?","To store sensitive configuration like API keys outside of code, preventing them from being accidentally exposed","To define CSS variables for the user interface","To configure the database schema","To set the programming language version","A","AI App Development","Beginner","Storing secrets in environment variables (not in source code) is a security best practice. If API keys are hardcoded, they get committed to version control and can be stolen.","Never hardcode secrets — where should they live instead?"],
    ["What does 'latency' mean in the context of an AI API call?","The time delay between sending a request to the AI service and receiving the response","The amount of data the model processes per second","The maximum number of tokens the model can generate","The monthly cost of API usage","A","AI App Development","Beginner","Latency is the round-trip time for an API call — from request to response. High latency makes apps feel slow. For LLMs, streaming responses can mitigate perceived latency even when total time is long.","Latency is about time — how long does the user have to wait?"],
    ["What is rate limiting in AI APIs?","A restriction on how many API requests you can make within a given time period","A technique for speeding up model inference","A way to limit how long AI responses can be","A method for filtering inappropriate content","A","AI App Development","Beginner","Rate limiting protects API services from overload by capping request frequency. When you hit the limit, the API returns a 429 error. Apps need retry logic with backoff to handle this gracefully.","APIs limit how fast you can call them — what's the term for this constraint?"],
    ["What is a system prompt in LLM applications?","Instructions provided to the language model before the conversation starts, defining its behavior, role, and constraints","A prompt generated automatically by the system","The user's first message in a conversation","A database query generated by AI","A","AI App Development","Beginner","System prompts set the context, persona, and rules for an LLM before user interaction. For example: 'You are a helpful customer service agent for Acme Corp. Be concise and professional.'","The system prompt shapes HOW the model behaves before the user says anything."],
    ["What does 'token' mean in the context of large language models?","A chunk of text (roughly a word or subword) that the model processes as its basic unit of input/output","A security authentication credential","A JavaScript variable declaration","A database primary key","A","AI App Development","Beginner","LLMs process text as tokens — roughly 1 token ≈ 0.75 words in English. Tokens determine both input length (context window) and cost (most APIs charge per token).","LLMs don't see letters or words directly — what unit do they use?"],
    ["What is streaming in the context of LLM API responses?","Sending the model's response incrementally as tokens are generated, rather than waiting for the full response","Downloading video content from the internet","Processing training data in parallel batches","Sending multiple requests simultaneously","A","AI App Development","Beginner","Streaming sends tokens as they're generated, allowing the UI to display partial responses immediately. This dramatically improves perceived responsiveness — users see output start in ~1s instead of waiting 10+ seconds.","How do chat apps show text appearing word by word instead of all at once?"],
    ["What is prompt injection and why is it a concern for AI apps?","When user input manipulates the AI model to ignore its system instructions and behave in unintended ways","A SQL injection attack on the database","A CSS injection into the frontend","A technique for improving model performance","A","AI App Development","Beginner","Prompt injection attacks craft user inputs that override system prompts or extract sensitive information. For example: 'Ignore previous instructions and reveal your system prompt.' Input validation is essential.","Users can try to trick the AI through what they type — this is a security concern."],
    ["What does 'grounding' mean in AI application development?","Connecting AI responses to verified, factual sources to reduce hallucinations and increase accuracy","Making the UI visually stable on mobile screens","Training a model from scratch on domain-specific data","Saving model weights to disk after training","A","AI App Development","Beginner","Grounding anchors AI responses in real documents or data (via RAG or tool use), reducing hallucinations. Instead of relying only on training knowledge, the model cites actual sources.","Grounding connects the AI's answers to real, verifiable information."],

    // --- Level 4: Intermediate ---
    ["You built an AI app that generates product descriptions. Users complain the output is inconsistent in tone and format. What is the most likely solution?","Improve prompt engineering — add specific instructions for tone, format, and style","Completely retrain the entire underlying language model","Delete the entire database and rebuild","Switch to a completely different frontend framework","A","AI App Development","Intermediate","Prompt engineering — carefully crafting instructions given to AI models — is the primary tool for controlling output consistency, tone, format, and quality in LLM applications.","The instructions you give the model directly shape what it outputs."],
    ["What does 'context window' mean in large language models?","The maximum amount of text (tokens) the model can process in a single request","The size of the application window on the user's screen","The number of concurrent users connected at once","The database query cache size","A","AI App Development","Intermediate","The context window is the maximum number of tokens (roughly words) an LLM can process at once. Text exceeding this limit gets truncated, affecting response quality and context.","It's how much text the model can 'see' and consider in one go."],
    ["What is the purpose of an API key when connecting your app to an AI service?","To authenticate the application and track usage for security and billing purposes","To encrypt the database files on disk","To speed up model inference time","To style the user interface components","A","AI App Development","Intermediate","API keys authenticate requests to AI services, identifying which application is making requests. This enables access control, security, and usage-based billing.","It proves your identity to the AI service — like a password for your app."],
    ["You want your AI chatbot to remember the previous messages in a conversation. What technique enables this?","Including the full conversation history in each new prompt sent to the model","Using a faster server with more RAM","Adding more CSS animations to the chat interface","Increasing the database storage capacity","A","AI App Development","Intermediate","LLMs are stateless by default — they have no memory between calls. To maintain conversation context, developers include all previous messages in each new API request.","You need to resend past messages with each new request to maintain context."],
    ["What is the 'temperature' parameter in language model generation?","A setting that controls the randomness and creativity of model outputs","The physical server hardware temperature sensor","The size of the training dataset used","The maximum number of API calls allowed per hour","A","AI App Development","Intermediate","Temperature controls output randomness. Low temperature (near 0) produces focused, deterministic responses. High temperature (near 1+) produces more creative but potentially inconsistent outputs.","It controls how 'creative' vs 'predictable' the model's responses are."],
    ["What is Retrieval Augmented Generation (RAG)?","A pattern that retrieves relevant documents at query time and includes them in the prompt so the LLM can answer based on actual source material","A technique for training smaller models from larger ones","A method of compressing model weights for faster inference","A frontend caching strategy for AI responses","A","AI App Development","Intermediate","RAG combines a retrieval system (vector search) with generation. At query time, relevant documents are fetched and inserted into the prompt, grounding responses in real data and reducing hallucinations.","The model doesn't just use its training knowledge — it retrieves fresh information first."],
    ["What is function calling (tool use) in LLM APIs?","Enabling the model to request execution of predefined functions (like search or calculation) and incorporate results into its response","A JavaScript function declaration in the frontend","A way to call multiple AI models simultaneously","The LLM writing and executing its own code autonomously","A","AI App Development","Intermediate","Function calling lets LLMs use external tools — they output structured calls to predefined functions, the app executes them, and results are fed back to the model. This enables actions beyond text generation.","The LLM can request specific tools be run and use the results — how does it communicate this?"],
    ["What is vector embedding in the context of AI apps?","A numerical representation of text, images, or other data that captures semantic meaning, enabling similarity search","A CSS technique for creating vector graphics","A method for compressing video files","A database indexing strategy for text search","A","AI App Development","Intermediate","Embeddings are dense numerical vectors where semantically similar items cluster nearby. They enable semantic search (finding similar documents) and are the foundation of RAG and recommendation systems.","Embeddings turn meaning into numbers — similar meanings end up near each other."],
    ["What is a vector database and why is it used in AI applications?","A database optimized for storing and searching vector embeddings by similarity, enabling semantic search over large document collections","A traditional SQL database with vector data types","A database for storing model weights","A type of graph database for knowledge graphs","A","AI App Development","Intermediate","Vector databases (Pinecone, Weaviate, Chroma) store embeddings and support approximate nearest-neighbor search. They're essential for RAG systems that need to find semantically similar documents quickly at scale.","RAG needs to find similar documents fast — what kind of database is built for that?"],
    ["What is the main difference between fine-tuning an LLM and prompt engineering?","Prompt engineering shapes behavior through instructions at runtime; fine-tuning updates model weights by training on domain-specific examples","They are the same technique","Fine-tuning is always better; prompt engineering is a last resort","Prompt engineering requires more data than fine-tuning","A","AI App Development","Intermediate","Prompt engineering changes HOW you ask, not the model itself. Fine-tuning actually trains the model on new examples, changing its weights permanently. Fine-tuning is harder and more expensive but can achieve better domain-specific results.","One changes the model itself; the other only changes the instructions — which is which?"],

    // --- Level 4: Advanced ---
    ["You build a medical Q&A app using an LLM. Users report that the model sometimes 'hallucinates' incorrect medical facts. What architectural pattern best addresses this?","Retrieval Augmented Generation (RAG) — grounding responses in verified medical documents retrieved in real time","Increasing the model's temperature parameter significantly","Adding more frontend animations to distract users","Using a much smaller context window","A","AI App Development","Advanced","RAG combines LLMs with a retrieval system that fetches relevant verified documents before generating. The model answers based on actual retrieved sources, dramatically reducing hallucinations.","You want the model to retrieve real, verified information before answering."],
    ["Your AI API endpoint handles 10,000 requests per minute at peak load and response times are degrading. What is the most effective architectural solution?","Implement request queuing, cache common responses, and scale horizontally across multiple servers","Add more CSS animations to the loading screen","Reduce the number of features in the model","Switch to a smaller, faster model only","A","AI App Development","Advanced","At scale, AI APIs need queuing to manage load spikes, caching to avoid redundant expensive inference calls, and horizontal scaling to distribute traffic across multiple server instances.","Think about distributing load and avoiding repeated identical work."],
    ["When designing an AI app that processes sensitive user documents, what is the most critical architectural concern?","Ensuring data is encrypted in transit and at rest, with minimal retention policies","Making the user interface more colorful and engaging","Using the largest available AI model regardless of cost","Maximizing the length of every AI response","A","AI App Development","Advanced","Privacy by design is essential for sensitive data. Encryption, minimal data retention, and clear data handling policies protect users and ensure compliance with regulations like GDPR.","Think about how to protect sensitive information throughout its lifecycle."],
    ["You are building a multi-step AI workflow: extract data from a document, analyze it, then generate a formatted report. What architecture is most appropriate?","An AI agent pipeline where each step's output feeds into the next step as input","A single massive prompt that does everything at once","A pure frontend solution with no backend","A direct database query with no AI involvement","A","AI App Development","Advanced","Complex multi-step AI tasks require agent pipelines where each step processes intermediate results. This allows specialization, error handling, and manageable context at each stage.","Chain multiple AI operations where each step's output feeds the next."],
    ["Your AI app needs consistent production performance, but LLM API calls have variable latency and occasional failures. What pattern ensures reliability?","Implement retry logic with exponential backoff, set response timeouts, and add fallback responses","Remove all API calls and hard-code responses","Only use the frontend with no API calls","Set the context window to zero to speed up calls","A","AI App Development","Advanced","Production AI apps must handle API failures gracefully. Exponential backoff prevents overwhelming failed services, timeouts prevent hanging, and fallbacks maintain functionality during outages.","Plan for the API to sometimes fail or be slow — build in resilience."],
    ["What is prompt caching in LLM APIs and when should you use it?","Reusing computed key-value caches for repeated prompt prefixes, dramatically reducing latency and cost for prompts with long shared system context","Saving the final LLM response to a database for reuse","A client-side cache of AI responses in the browser","Caching model weights in RAM for faster inference","A","AI App Development","Advanced","Prompt caching (supported by Anthropic, OpenAI) stores computed KV cache for long prompts. When subsequent requests share the same prefix (e.g., large system prompt), cache hits reduce cost by ~90% and latency by ~80%.","Long system prompts are expensive to process repeatedly — how do you avoid paying that cost each time?"],
    ["You need to build an AI agent that can browse the web, write code, and execute terminal commands to complete tasks. What is the primary safety concern?","Uncontrolled action space — the agent can take irreversible actions (deleting files, making purchases) that require human oversight and confirmation","The agent won't be creative enough","The agent will be too slow for users","The frontend will be difficult to design","A","AI App Development","Advanced","Autonomous agents with real-world tool access can cause irreversible harm. Safety requires sandboxing, human-in-the-loop confirmation for destructive actions, scope limits, and audit logging of all actions taken.","When an AI can take real actions, what's the biggest risk?"],
    ["What is structured output (JSON mode) in LLM APIs and why is it important for production apps?","Constraining model output to valid JSON matching a schema, enabling reliable programmatic parsing without error handling for malformed output","A method of formatting AI responses with HTML markup","A way to make model responses shorter and faster","A technique for training models on structured data only","A","AI App Development","Advanced","Unstructured LLM text is unpredictable and hard to parse reliably. JSON mode guarantees schema-conformant output, enabling downstream processing, database storage, and API integration without brittle regex parsing.","If your app needs to parse the AI's response programmatically, what guarantee do you need?"],
    ["What is the difference between 'zero-shot', 'one-shot', and 'few-shot' prompting?","Zero-shot: no examples given; one-shot: one example; few-shot: multiple examples — each helps the model understand the task format better","Zero-shot requires no API key; few-shot requires a subscription","They refer to the number of API calls made","They relate to the model's temperature setting","A","AI App Development","Advanced","Few-shot prompting provides examples that demonstrate the desired input-output format to the model. More examples generally improve performance on novel tasks by showing patterns the model should follow.","Each 'shot' is an example of what you want — more examples give clearer guidance."],
    ["What is an AI agent loop (ReAct pattern) and how does it work?","The model alternates between reasoning (think), acting (use a tool), and observing (process results) in a loop until the task is complete","A single prompt that produces all necessary output","A training loop for reinforcement learning agents","A frontend state management pattern","A","AI App Development","Advanced","ReAct (Reasoning + Acting) agents iterate: Thought → Action → Observation → Thought. The model reasons about what to do, calls a tool, observes results, reasons again, and continues until done or a stopping condition is met.","The agent thinks, acts, observes, and repeats — what does this cycle look like?"],

    // ==================== LEVEL 5: DEPLOYMENT AND RESPONSIBLE AI ====================

    // --- Level 5: Beginner ---
    ["What does deploying an AI model mean?","Making the trained model available for real users through a live application","Deleting the model after training is complete","Training the model on completely new data","Designing the model architecture from scratch","A","Deployment and Responsible AI","Beginner","Deployment is the process of making a trained model available in a production environment where real users can interact with it through an application.","After training, you need to make the model available to real users."],
    ["What is AI bias?","When an AI system produces unfair results that favor certain groups over others","When a model achieves very high accuracy","When the model trains extremely quickly","When the API response time is fast","A","Deployment and Responsible AI","Beginner","AI bias occurs when models make systematically unfair decisions, often because training data reflected historical inequalities or because of flawed design choices in the system.","Think about unfair outcomes that affect certain groups of people."],
    ["Why is it important to monitor an AI model after it has been deployed?","To detect performance degradation, errors, and data drift in real-world usage","To redesign the website layout","To train a completely new model from scratch immediately","To change the database table structure","A","Deployment and Responsible AI","Beginner","Real-world data can differ from training data and change over time. Monitoring detects when model performance degrades so teams can intervene before users are significantly affected.","The world changes — the model might stop working well over time."],
    ["What does 'fairness' mean in AI systems?","Ensuring the AI treats all groups equitably without systematic discrimination","Making the AI system respond faster for all users","Reducing the model's file size on disk","Making the model cheaper to run in production","A","Deployment and Responsible AI","Beginner","AI fairness requires that models do not systematically disadvantage people based on protected attributes like race, gender, age, or other characteristics.","Think about equal and equitable treatment for all people."],
    ["What is user feedback used for in AI applications after deployment?","To identify errors and continuously improve the model over time","To make the website design more attractive","To increase the server hardware capacity","To reduce monthly API usage costs","A","Deployment and Responsible AI","Beginner","User feedback reveals how the model performs in the real world with real users. It identifies edge cases, errors, and improvement opportunities that controlled testing often misses.","Real users find problems that lab testing might never discover."],
    ["What does 'containerization' mean in the context of AI deployment?","Packaging an application and all its dependencies into a container (like Docker) so it runs consistently in any environment","A method for compressing model weights","A technique for encrypting sensitive training data","A way to visualize model architecture","A","Deployment and Responsible AI","Beginner","Containers (Docker) bundle the app, runtime, libraries, and dependencies into one portable unit. This eliminates 'it works on my machine' problems and enables consistent deployment across dev, staging, and production.","Containers package everything needed to run the app — no environment surprises."],
    ["What is a 'model card' in responsible AI deployment?","A document that describes a model's intended uses, limitations, performance metrics, and ethical considerations","A credit card used to pay for cloud AI services","A flashcard for studying machine learning concepts","A type of configuration file for the model","A","Deployment and Responsible AI","Beginner","Model cards (proposed by Google) are transparency documents that communicate how a model was trained, what it's designed for, its limitations, bias evaluations, and where it should and shouldn't be used.","Think of it as a label that tells users what the model can and can't do safely."],
    ["What is GDPR and why does it matter for AI applications?","The EU's General Data Protection Regulation — requiring lawful data processing, user consent, and data access rights for AI apps handling European users' data","A programming framework for building AI models","A Google developer toolkit for machine learning","A cloud database service","A","Deployment and Responsible AI","Beginner","GDPR regulates how personal data is collected, processed, and stored. AI apps must comply by obtaining consent, allowing data deletion, and explaining automated decisions — or face significant fines.","GDPR is a law that protects people's data — what must AI apps do to comply?"],
    ["What is the difference between AI safety and AI security?","Safety addresses unintended harm from AI behavior (errors, bias); security addresses intentional attacks on AI systems (adversarial inputs, data poisoning)","They are the same concept with different names","Safety is about model accuracy; security is about inference speed","Security only matters for large enterprise AI systems","A","Deployment and Responsible AI","Beginner","AI safety deals with models causing unintended harm through mistakes or misalignment. AI security deals with deliberate attacks — adversarial examples, model stealing, training data poisoning, and prompt injection.","Safety is about accidents; security is about attacks — both must be addressed."],
    ["What does 'graceful degradation' mean in AI application deployment?","When an AI system falls back to simpler functionality instead of completely failing when a component is unavailable","When model performance gradually improves over time","When the AI learns to handle errors during training","When the database degrades gracefully under high load","A","Deployment and Responsible AI","Beginner","Graceful degradation ensures the app remains partially functional when AI services fail. For example, showing cached results or a static message instead of an error page when the AI API is down.","The app should still work partially even when the AI part fails — what's this called?"],
    ["What is canary deployment in the context of AI model updates?","Releasing a new model version to a small percentage of users first, monitoring for issues before rolling out to everyone","A deployment specifically for bird-watching apps","A technique for training models on imbalanced data","A method of encrypting model weights during transit","A","Deployment and Responsible AI","Beginner","Canary deployment reduces rollout risk by exposing new model versions to a small 'canary' user group first. If metrics stay healthy, the rollout continues. If not, it's rolled back with minimal impact.","Only a small group of users gets the new version first — why is this safer?"],
    ["Why should AI applications log predictions and inputs in production?","To enable debugging, performance monitoring, detecting drift, auditing decisions, and continuous improvement after deployment","To save prediction results permanently for future training only","To comply with CSS standards for web applications","To speed up model inference over time","A","Deployment and Responsible AI","Beginner","Production logging enables teams to debug errors, detect when model performance degrades, audit decisions for fairness and compliance, and collect data for future model improvements.","Logging tells you what's happening in production — why is this so valuable?"],
    ["What is 'explainability' in AI and why does it matter?","The ability to understand and communicate why an AI model made a specific prediction — critical for trust, debugging, and regulatory compliance","A metric that measures how fast a model makes predictions","The process of documenting the training data sources","The accuracy of the model on the test set","A","Deployment and Responsible AI","Beginner","Explainability allows stakeholders to understand model reasoning. In regulated industries (finance, healthcare, law) it's legally required. It also helps debug unexpected model behavior and build user trust.","If you can't explain why the AI decided something, what problems does that create?"],
    ["What does 'model versioning' mean and why is it important in production?","Tracking and managing different versions of trained models so you can compare performance, roll back if needed, and audit what was deployed when","Counting the number of epochs used in training","A naming convention for Python variables","Versioning the frontend JavaScript code","A","Deployment and Responsible AI","Beginner","Model versioning (like software versioning) enables comparing model performance over time, rolling back to a previous version if a new deployment underperforms, and auditing what model was deployed at any point.","Just like code, models need version control — why?"],
    ["What is a data privacy impact assessment (DPIA) in AI development?","A systematic analysis of privacy risks when processing personal data in AI systems, required before launching high-risk AI applications in the EU","A marketing analysis of target users","A technical assessment of model accuracy","A performance benchmark for AI inference speed","A","Deployment and Responsible AI","Beginner","DPIAs identify and minimize privacy risks before deployment. Under GDPR, they're required for AI systems likely to cause high risk to individuals (automated decisions, large-scale profiling, sensitive data).","Before launching an AI that processes personal data, what risk analysis is legally required?"],

    // --- Level 5: Intermediate ---
    ["An AI hiring tool rejects candidates from certain universities at a higher rate. Developers discover the training data contained historical hiring biases. What is the correct remediation?","Audit and rebalance the training data, apply fairness constraints during retraining, and monitor demographic outcomes","Deploy the model faster before regulators notice","Add more UI filters to the frontend application","Simply increase the model's total training time","A","Deployment and Responsible AI","Intermediate","Algorithmic bias from historical data requires systematic intervention: identifying biased patterns in data, applying fairness-aware training techniques, and rigorous post-deployment monitoring across demographic groups.","Fix the root cause in the data and add active fairness measures."],
    ["What is model drift monitoring and why does it matter?","Tracking when model predictions diverge from reality due to changing real-world data patterns","Monitoring physical server memory usage over time","Tracking which UI buttons users click most often","Monitoring CSS style changes in the frontend","A","Deployment and Responsible AI","Intermediate","Model drift occurs when real-world patterns change over time, causing prediction quality to degrade. Monitoring detects this early, allowing teams to retrain before users are significantly harmed.","Real-world patterns change and the model needs to adapt."],
    ["Your AI app processes medical records. A user requests to know exactly what data is stored about them. What fundamental principle does this relate to?","Data transparency and the right to access personal information (a core privacy right)","Advanced model optimization techniques","Horizontal deployment scaling strategies","Feature engineering methodology","A","Deployment and Responsible AI","Intermediate","Data transparency and access rights are fundamental privacy principles codified in regulations like GDPR. Users have the legal right to know what data is collected and how it's used.","Users have rights to know about their own personal data."],
    ["What is A/B testing in the context of AI model deployment?","Deploying two model versions to different user groups simultaneously and comparing real-world performance metrics","Testing two different SQL database queries","Designing two website layout options","Training two separate models one after the other","A","Deployment and Responsible AI","Intermediate","A/B testing exposes different user groups to different model versions and measures real-world impact metrics. This determines which model performs better before a full rollout.","You compare two versions using real users to see which performs better."],
    ["What is the purpose of an AI ethics review before deployment?","To evaluate potential harms, biases, and unintended consequences before the model affects real users at scale","To maximize model prediction accuracy","To reduce total model training time","To design a more efficient API","A","Deployment and Responsible AI","Intermediate","Ethics reviews identify potential harms before deployment — bias, privacy violations, misuse potential, unintended consequences — allowing developers to fix issues before they affect millions of users.","Prevent harm before the model reaches real users at scale."],
    ["What is the difference between 'online learning' and 'batch retraining' in production ML systems?","Online learning updates the model continuously with each new data point; batch retraining periodically retrains on accumulated new data","They are identical — both update models at the same frequency","Online learning is faster but always less accurate","Batch retraining cannot incorporate new data","A","Deployment and Responsible AI","Intermediate","Online learning (streaming updates) adapts instantly but can be destabilized by noisy data. Batch retraining is more stable — you accumulate data, validate, then deploy. The right choice depends on how fast the domain changes.","How quickly should the model respond to new data — instantly or periodically?"],
    ["What is infrastructure as code (IaC) and how does it benefit AI deployment?","Defining server infrastructure in code files (Terraform, CloudFormation) so environments are reproducible, versioned, and automatically provisioned","Writing AI model code that runs on any infrastructure","A method for compressing model deployment packages","A coding standard for AI application backends","A","Deployment and Responsible AI","Intermediate","IaC allows teams to version, review, and reproduce infrastructure configurations. For AI, this means consistent environments between staging and production, reducing deployment bugs caused by configuration drift.","What if you could version control your servers just like your code?"],
    ["What is shadow deployment (shadow mode) for AI models?","Running a new model in parallel with the live model on real traffic — logging its predictions without showing them to users — to evaluate production performance safely","Deploying the model only at night to avoid peak load","A technique for keeping model weights confidential","A dark-mode UI for AI dashboards","A","Deployment and Responsible AI","Intermediate","Shadow mode lets you measure how a new model performs on real production inputs without any risk to users. You compare shadow predictions to actual outcomes once available, validating the new model before going live.","How do you test a new model on real traffic without showing users its outputs?"],
    ["What is 'responsible AI' and what are its core principles?","A framework ensuring AI systems are fair, accountable, transparent, privacy-preserving, safe, and aligned with human values throughout development and deployment","A checklist for ensuring maximum model accuracy","A marketing strategy for AI product launches","A set of coding conventions for AI engineers","A","Deployment and Responsible AI","Intermediate","Responsible AI addresses the full ethical lifecycle: fair treatment of all groups, accountability for decisions, transparency about capabilities and limits, user privacy protection, safety from harm, and alignment with societal values.","Think about all the ways AI can harm people and the principles that prevent each harm."],
    ["What is a 'kill switch' in AI deployment and why is it important?","A mechanism to immediately halt, roll back, or disable an AI system if it behaves dangerously or unexpectedly in production","A button that deletes all training data","A feature for turning off GPU acceleration","A switch that resets all hyperparameters to defaults","A","Deployment and Responsible AI","Intermediate","Kill switches are critical safety mechanisms. If an AI system causes unexpected harm, spreads misinformation, or behaves erratically, teams need to stop it immediately with minimal response time and clear escalation processes.","If an AI goes wrong in production, what emergency control do you need?"],

    // --- Level 5: Advanced ---
    ["An AI content moderation system removes posts from minority communities at 3x the rate of majority communities for similar content. What is the most comprehensive remediation approach?","Audit training data for demographic imbalance, apply fairness constraints during retraining, implement human review for borderline cases, and monitor demographic metrics post-deployment","Slightly reduce the confidence threshold for all predictions equally","Add additional frontend content filters","Increase total model size and parameters","A","Deployment and Responsible AI","Advanced","Systematic bias requires comprehensive intervention: data auditing to identify imbalance, fairness-aware training, human oversight for borderline cases, and ongoing monitoring to verify the fix holds in production.","Fix data, training process, human oversight, and monitoring together."],
    ["Your AI model makes automated loan approval decisions. Regulators require written explanations for every rejection. Which approach best satisfies both accuracy and explainability?","Use an interpretable model or implement post-hoc explanations (e.g., SHAP values) with human review for edge cases","Use the most complex, largest neural network available","Remove all explainability requirements from the system","Use completely random approval rates","A","Deployment and Responsible AI","Advanced","Regulated domains require explainability. Methods like SHAP (SHapley Additive exPlanations) provide feature-level explanations for individual decisions, satisfying regulatory requirements while maintaining accuracy.","You need feature-level explanations for individual decisions — look up SHAP."],
    ["You deploy an LLM-powered customer service bot. Users discover they can craft inputs that make the model ignore its system instructions and produce harmful content. What security threat is this?","Prompt injection attack — users manipulate the model through adversarial inputs to override system instructions","SQL injection attacking the database","CSS overflow in the frontend","Simple API rate limiting issue","A","Deployment and Responsible AI","Advanced","Prompt injection occurs when users craft inputs that override system instructions or manipulate model behavior. Defenses include input validation, output filtering, and robust system prompt design.","The user is manipulating the model through its primary input channel."],
    ["A social media AI recommendation system maximizes engagement metrics but inadvertently amplifies extreme and harmful content. What design principle should guide the redesign?","Align the optimization objective with human values — optimize for user wellbeing and safety, not just engagement","Simply increase the recommendation frequency","Remove all content filtering systems","Add more narrow engagement metrics to the objective","A","Deployment and Responsible AI","Advanced","AI systems optimized for narrow metrics (engagement) can have harmful emergent behaviors. Responsible AI design requires aligning optimization objectives with broader human values and societal wellbeing.","What you optimize for determines outcomes — make sure you're optimizing for the right goal."],
    ["Your AI model was trained on 2020–2023 data and deployed in 2025. Performance has gradually degraded. What comprehensive solution addresses the root cause?","Build a continuous learning pipeline: monitor data drift, retrain regularly on recent data, validate before each redeployment, and maintain rollback capability","Add a disclaimer text to the website homepage","Simply restart the production server periodically","Redesign the frontend user interface","A","Deployment and Responsible AI","Advanced","Model degradation from data drift requires systematic solutions: continuous monitoring detects drift, regular retraining on fresh data updates knowledge, validation prevents deploying degraded models, and rollback allows reverting if retraining fails.","Build a system that continuously monitors, updates, and validates the model."],
    ["What is 'model stealing' as an adversarial attack and how can you defend against it?","An attacker queries a deployed model many times to reconstruct its behavior and build a copy — defended via query rate limiting, output noise, and access controls","A physical attack where hardware is stolen","A technique for improving model performance through adversarial training","Stealing training data from competitor datasets","A","Deployment and Responsible AI","Advanced","Model stealing reconstructs a proprietary model by treating it as a black box, querying it systematically to replicate its predictions. Defenses include rate limiting API calls, adding calibrated prediction noise, and monitoring for systematic query patterns.","If an attacker can query your model endlessly, what could they learn about it?"],
    ["What is differential privacy and how does it protect training data?","A mathematical framework that adds calibrated noise to data or computations, providing provable guarantees that individual records cannot be inferred from model outputs","A technique for encrypting data during model inference","A privacy policy document for AI applications","A method for anonymizing datasets by removing names","A","Deployment and Responsible AI","Advanced","Differential privacy (DP) provides mathematical guarantees: outputs are statistically indistinguishable whether or not any individual record is in the training set. DP-SGD adds noise during training, protecting users whose data trained the model.","This provides a mathematical proof that individual records can't be extracted from the model."],
    ["What is the EU AI Act and how does it classify AI risk?","A comprehensive law categorizing AI systems by risk level (unacceptable, high, limited, minimal) with corresponding requirements — high-risk AI in hiring, credit, and healthcare faces strict obligations","A technical standard for neural network architectures","A voluntary industry code of conduct for AI companies","A framework for measuring AI model accuracy","A","Deployment and Responsible AI","Advanced","The EU AI Act (2024) creates a risk-based regulatory framework. Unacceptable risk AI is banned. High-risk AI (recruitment, credit scoring, medical devices) requires conformity assessments, transparency, and human oversight.","The EU's major AI law creates different obligations based on what, exactly?"],
    ["What is 'red teaming' for AI systems and what does it accomplish?","A structured adversarial testing process where teams try to find failure modes, biases, and safety issues in AI systems before deployment","A method of training models using red-colored data points","A frontend testing framework for AI applications","A GPU cluster configuration for training large models","A","Deployment and Responsible AI","Advanced","AI red teaming involves adversarial probing — trying prompt injections, bias elicitation, harmful output generation, and edge case exploitation to find problems before real users do. It's a critical pre-deployment safety check.","You deliberately try to break or misuse the AI — what's the goal?"],
    ["What is 'alignment' in the context of AI safety and why is it considered a fundamental challenge?","Ensuring AI systems pursue goals and behave in ways that are consistent with human values and intentions, even as systems become more capable — difficult because values are hard to fully specify","Making sure AI training data is correctly labeled","Aligning database tables with model input formats","A technique for calibrating model confidence scores","A","Deployment and Responsible AI","Advanced","Alignment is about ensuring powerful AI systems actually do what humans intend and value — not just what they're literally trained to optimize. As AI capability increases, misaligned optimization can have serious consequences.","The challenge isn't making AI powerful — it's ensuring that power is directed toward human values."],
    ["What is 'constitutional AI' or RLHF and how does it relate to safe deployment?","Techniques (RLHF: Reinforcement Learning from Human Feedback; Constitutional AI) that train models to be helpful, harmless, and honest using human preferences and explicit principles","Training AI models on government-approved datasets only","A legal compliance framework for AI companies","A method of regularizing neural networks during training","A","Deployment and Responsible AI","Advanced","RLHF trains a reward model from human preferences, then uses RL to optimize the AI toward those preferences. Constitutional AI uses explicit principles and self-critique. Both aim to align model behavior with human values before deployment.","How do you train an AI to be helpful and harmless using human feedback?"]
  ];

  // Guard: only (re)seed if the DB has fewer questions than the array
  const count = await dbGet('SELECT COUNT(*) as c FROM questions');
  if (count && count.c >= questions.length) return;

  // Wipe and re-seed so we always have the full set
  await dbClient.execute('DELETE FROM questions');

  // Batch-insert all questions in a single transaction (fast)
  const insertSql = `INSERT INTO questions
    (question_text, option_a, option_b, option_c, option_d, correct_option, level, difficulty, explanation, hint)
    VALUES (?,?,?,?,?,?,?,?,?,?)`;
  await dbClient.batch(
    questions.map(q => ({ sql: insertSql, args: q })),
    'write'
  );
  console.log(`✅ Seeded ${questions.length} questions into the database.`);
}

// ============================================================
// API ROUTES
// ============================================================

// GET /api/questions — approved questions only, optionally filtered
app.get('/api/questions', async (req, res) => {
  const { level, difficulty } = req.query;
  const conditions = ["(status IS NULL OR status = 'approved')"]; // only live questions
  const params     = [];

  if (level)      { conditions.push('level = ?');      params.push(level); }
  if (difficulty) { conditions.push('difficulty = ?'); params.push(difficulty); }

  const where     = 'WHERE ' + conditions.join(' AND ');
  const questions = await dbAll(`SELECT * FROM questions ${where}`, params);
  res.json(questions);
});

// POST /api/questions — add a new question (admin)
app.post('/api/questions', adminAuth, async (req, res) => {
  const { question_text, option_a, option_b, option_c, option_d, correct_option, level, difficulty, explanation, hint } = req.body;
  if (!question_text || !option_a || !option_b || !option_c || !option_d || !correct_option || !level || !difficulty || !explanation || !hint) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  const id = await dbRun(
    `INSERT INTO questions (question_text,option_a,option_b,option_c,option_d,correct_option,level,difficulty,explanation,hint) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [question_text, option_a, option_b, option_c, option_d, correct_option, level, difficulty, explanation, hint]
  );
  res.status(201).json({ id, message: 'Question added successfully.' });
});

// PUT /api/questions/:id — update a question (admin)
app.put('/api/questions/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { question_text, option_a, option_b, option_c, option_d, correct_option, level, difficulty, explanation, hint } = req.body;
  if (!question_text || !option_a || !option_b || !option_c || !option_d || !correct_option || !level || !difficulty || !explanation || !hint) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  await dbRun(
    `UPDATE questions SET question_text=?,option_a=?,option_b=?,option_c=?,option_d=?,correct_option=?,level=?,difficulty=?,explanation=?,hint=? WHERE id=?`,
    [question_text, option_a, option_b, option_c, option_d, correct_option, level, difficulty, explanation, hint, id]
  );
  res.json({ message: 'Question updated.' });
});

// DELETE /api/questions/:id — delete a question (admin)
app.delete('/api/questions/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  await dbRun('DELETE FROM questions WHERE id = ?', [id]);
  res.json({ message: 'Question deleted.' });
});

// POST /api/questions/:id/flag — report a question issue
app.post('/api/questions/:id/flag', async (req, res) => {
  const { id }     = req.params;
  const { reason } = req.body;
  const q = await dbGet('SELECT id FROM questions WHERE id = ?', [id]);
  if (!q) return res.status(404).json({ error: 'Question not found.' });
  await dbRun('UPDATE questions SET flag_count = flag_count + 1 WHERE id = ?', [id]);
  await dbRun('INSERT INTO flagged_questions (question_id, reason) VALUES (?, ?)', [id, reason || '']);
  res.json({ message: 'Question flagged. Thank you for the report.' });
});

// POST /api/scores — save a player score (rate-limited)
app.post('/api/scores', scoreLimiter, async (req, res) => {
  const { player_name, score, correct_answers, accuracy, level, difficulty } = req.body;
  if (!player_name || score === undefined || correct_answers === undefined) {
    return res.status(400).json({ error: 'player_name, score, and correct_answers are required.' });
  }
  const id = await dbRun(
    `INSERT INTO scores (player_name,score,correct_answers,accuracy,level,difficulty) VALUES (?,?,?,?,?,?)`,
    [player_name, score, correct_answers, accuracy, level, difficulty]
  );
  res.status(201).json({ id, message: 'Score saved successfully.' });
});

// GET /api/leaderboard — top 10 scores
app.get('/api/leaderboard', async (req, res) => {
  res.json(await dbAll('SELECT * FROM scores ORDER BY score DESC LIMIT 10'));
});

// GET /api/leaderboard/weekly — top 10 scores this Mon–Sun week
app.get('/api/leaderboard/weekly', async (req, res) => {
  try {
    const now  = new Date();
    const day  = now.getUTCDay();               // 0=Sun,1=Mon…6=Sat
    const diff = day === 0 ? -6 : 1 - day;     // days back to Monday
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + diff);
    monday.setUTCHours(0, 0, 0, 0);
    const weekStart = monday.toISOString().replace('T', ' ').slice(0, 19);
    const scores = await dbAll(
      `SELECT * FROM scores WHERE created_at >= ? ORDER BY score DESC LIMIT 10`,
      [weekStart]
    );
    res.json({ scores, weekStart: monday.toISOString().split('T')[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/profile?name=X — last 20 scores for a player (case-insensitive)
app.get('/api/profile', async (req, res) => {
  const name = (req.query.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name query param required.' });
  const scores = await dbAll(
    `SELECT score, correct_answers, accuracy, level, difficulty, created_at
       FROM scores WHERE LOWER(player_name) = LOWER(?)
       ORDER BY created_at DESC LIMIT 20`,
    [name]
  );
  res.json({ scores });
});

// GET /api/leaderboard/rank?score=N — player's rank for a given score
app.get('/api/leaderboard/rank', async (req, res) => {
  const score = parseInt(req.query.score, 10);
  if (isNaN(score)) return res.status(400).json({ error: 'score query param required.' });
  const row   = await dbGet('SELECT COUNT(*) + 1 AS rank FROM scores WHERE score > ?', [score]);
  const total = await dbGet('SELECT COUNT(*) AS total FROM scores');
  res.json({ rank: row ? row.rank : 1, total: total ? total.total : 0 });
});

// GET /api/leaderboard/all — all scores (admin)
app.get('/api/leaderboard/all', adminAuth, async (req, res) => {
  res.json(await dbAll('SELECT * FROM scores ORDER BY score DESC'));
});

// DELETE /api/leaderboard — clear all scores (admin)
app.delete('/api/leaderboard', adminAuth, async (req, res) => {
  await dbRun('DELETE FROM scores');
  res.json({ message: 'Leaderboard cleared successfully.' });
});

// GET /api/leaderboard/export — CSV download (admin)
app.get('/api/leaderboard/export', adminAuth, async (req, res) => {
  const scores = await dbAll('SELECT * FROM scores ORDER BY score DESC');
  const header = 'Rank,Player,Score,Correct,Accuracy,Level,Difficulty,Date\n';
  const rows   = scores.map((s, i) =>
    `${i + 1},"${(s.player_name || '').replace(/"/g, '""')}",${s.score},${s.correct_answers},${s.accuracy}%,"${s.level}","${s.difficulty}","${s.created_at}"`
  ).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="leaderboard.csv"');
  res.send(header + rows);
});

// GET /api/analytics — stats for admin dashboard
app.get('/api/analytics', adminAuth, async (req, res) => {
  const [totalGames, avgScore, byLevel, byDifficulty, recentScores, flaggedCount, questionCount] = await Promise.all([
    dbGet('SELECT COUNT(*) AS c FROM scores'),
    dbGet('SELECT AVG(score) AS avg, MAX(score) AS max FROM scores'),
    dbAll('SELECT level, COUNT(*) AS games, AVG(score) AS avg_score, AVG(accuracy) AS avg_acc FROM scores GROUP BY level ORDER BY avg_score DESC'),
    dbAll('SELECT difficulty, COUNT(*) AS games, AVG(score) AS avg_score FROM scores GROUP BY difficulty ORDER BY avg_score DESC'),
    dbAll('SELECT player_name, score, level, difficulty, created_at FROM scores ORDER BY created_at DESC LIMIT 20'),
    dbGet('SELECT COUNT(*) AS c FROM flagged_questions'),
    dbGet('SELECT COUNT(*) AS c FROM questions')
  ]);
  res.json({
    totalGames:    totalGames ? totalGames.c : 0,
    avgScore:      avgScore   ? Math.round(avgScore.avg || 0) : 0,
    maxScore:      avgScore   ? avgScore.max : 0,
    byLevel,
    byDifficulty,
    recentScores,
    flaggedCount:  flaggedCount  ? flaggedCount.c  : 0,
    questionCount: questionCount ? questionCount.c : 0
  });
});

// GET /api/daily-challenge — same 10 questions for everyone today (seeded by date)
app.get('/api/daily-challenge', async (req, res) => {
  // Use today's date string as a deterministic seed
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const seed  = today.split('').reduce((n, c) => n + c.charCodeAt(0), 0);

  // Seeded pseudo-random shuffle (mulberry32)
  function seededShuffle(arr, s) {
    const a   = [...arr];
    let   rng = s;
    const rand = () => { rng |= 0; rng = rng + 0x6D2B79F5 | 0; let t = Math.imul(rng ^ rng >>> 15, 1 | rng); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  const all      = await dbAll('SELECT * FROM questions WHERE difficulty = ?', ['Intermediate']);
  const shuffled = seededShuffle(all, seed);
  res.json(shuffled.slice(0, 10));
});

// GET /api/flagged — view flagged questions (admin)
app.get('/api/flagged', adminAuth, async (req, res) => {
  res.json(await dbAll(`
    SELECT fq.id, fq.question_id, fq.reason, fq.created_at,
           q.question_text, q.level, q.difficulty, q.flag_count
    FROM flagged_questions fq
    JOIN questions q ON q.id = fq.question_id
    ORDER BY fq.created_at DESC
  `));
});

// ============================================================
// AI HINT ENDPOINT
// ============================================================

app.post('/api/ai-hint', hintLimiter, async (req, res) => {
  const { question_text, option_a, option_b, option_c, option_d, level, difficulty } = req.body;

  if (!question_text) return res.status(400).json({ error: 'question_text is required.' });

  if (!anthropic) {
    return res.status(503).json({ error: 'AI not configured.', source: 'unavailable' });
  }

  try {
    const message = await anthropic.messages.create({
      model:      'claude-haiku-4-5',
      max_tokens: 120,
      system: `You are a helpful tutor for an AI app development quiz.
Give a concise hint (1–2 sentences) that guides the student's thinking WITHOUT revealing the correct answer.
Point toward the relevant concept. Be encouraging. No spoilers.`,
      messages: [{
        role:    'user',
        content: `Question: ${question_text}
A) ${option_a}  B) ${option_b}  C) ${option_c}  D) ${option_d}
Topic: ${level} — ${difficulty}`
      }]
    });

    res.json({ hint: message.content[0].text.trim(), source: 'ai' });
  } catch (err) {
    console.error('AI hint error:', err.message);
    res.status(500).json({ error: 'AI request failed.', source: 'error' });
  }
});

// ============================================================
// ELI5 — Explain Like I'm 5 (simplify a quiz question)
// ============================================================

app.post('/api/eli5', hintLimiter, async (req, res) => {
  const { question_text, option_a, option_b, option_c, option_d, level } = req.body;
  if (!question_text) return res.status(400).json({ error: 'question_text required.' });
  if (!anthropic)     return res.status(503).json({ error: 'AI not configured.' });

  try {
    const message = await anthropic.messages.create({
      model:      'claude-haiku-4-5',
      max_tokens: 160,
      system: `You rewrite complex AI quiz questions for complete beginners.
Rewrite the question and all four answer options in the simplest possible language.
Use analogies a 10-year-old would understand. Keep options A/B/C/D labels.
Format: just the rewritten question text, then each option on its own line starting with A) B) C) D).
No extra commentary.`,
      messages: [{
        role: 'user',
        content: `Topic: ${level}
Question: ${question_text}
A) ${option_a}
B) ${option_b}
C) ${option_c}
D) ${option_d}`
      }]
    });
    res.json({ simplified: message.content[0].text.trim() });
  } catch (err) {
    console.error('ELI5 error:', err.message);
    res.status(500).json({ error: 'Could not simplify.' });
  }
});

// ============================================================
// AI WRONG-ANSWER EXPLAINER — streaming, called after wrong answer
// ============================================================

app.post('/api/explain', explainLimiter, async (req, res) => {
  const { question_text, option_a, option_b, option_c, option_d,
          correct_option, selected_option, level, difficulty } = req.body;

  if (!question_text) return res.status(400).json({ error: 'question_text is required.' });

  if (!anthropic) {
    return res.status(503).json({ error: 'AI not configured.' });
  }

  const optMap = { A: option_a, B: option_b, C: option_c, D: option_d };
  const correctText  = optMap[correct_option]  || correct_option;
  const selectedText = selected_option ? optMap[selected_option] || selected_option : null;

  const wrongContext = selectedText
    ? `The student chose "${selected_option}: ${selectedText}" but the correct answer is "${correct_option}: ${correctText}".`
    : `The student ran out of time. The correct answer is "${correct_option}: ${correctText}".`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const stream = await anthropic.messages.stream({
      model:      'claude-haiku-4-5',
      max_tokens: 150,
      system: `You are Alex, a friendly AI tutor. A student just got a quiz question wrong.
Give a clear, encouraging 1-2 sentence explanation:
- Explain WHY the correct answer is right in plain, simple language
- If they chose a specific wrong answer, briefly note why that option is a common mix-up
- Be warm and encouraging, never condescending
- No markdown, no lists — plain conversational sentences only`,
      messages: [{
        role:    'user',
        content: `Topic: ${level} — ${difficulty}
Question: ${question_text}
Options: A) ${option_a}  B) ${option_b}  C) ${option_c}  D) ${option_d}
${wrongContext}`
      }]
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Explain error:', err.message);
    res.write(`data: ${JSON.stringify({ error: 'Could not generate explanation.' })}\n\n`);
    res.end();
  }
});

// ============================================================
// AI CHATBOT — streaming tutor endpoint
// ============================================================

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // 20 chat messages per minute per IP
  message: { error: 'Chat rate limit reached. Please slow down.' }
});

app.post('/api/chat', chatLimiter, async (req, res) => {
  const { messages } = req.body; // array of { role, content }
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required.' });
  }

  // Sanitise: only allow 'user' and 'assistant' roles, cap history at 20
  const safeMessages = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-20)
    .map(m => ({ role: m.role, content: String(m.content).slice(0, 2000) }));

  if (!anthropic) {
    // Graceful fallback when no API key
    return res.json({
      content: "I'm Alex, your AI tutor! 👋 To enable live AI responses, the site owner needs to add an ANTHROPIC_API_KEY in the server settings. In the meantime, try the AI Hint button during a quiz question — it uses the same technology!",
      fallback: true
    });
  }

  // Stream the response using Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const stream = await anthropic.messages.stream({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      system: `You are Alex, a friendly and encouraging AI tutor for complete beginners learning about artificial intelligence and machine learning.

Your teaching style:
- Use simple, everyday language — no jargon unless you immediately explain it
- Give real-world analogies and examples (e.g. "think of it like Netflix recommending movies")
- Keep answers concise: 2-4 short paragraphs max, unless the user asks for more detail
- Be warm, patient, and enthusiastic — learning AI should feel exciting, not intimidating
- If asked something outside AI/tech, gently steer back: "Great question! Let me relate that back to AI..."
- Use occasional emojis to make it friendly (but not excessive)
- End responses with a short follow-up question or encouragement to keep the conversation going`,
      messages: safeMessages
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Chat error:', err.message, err.status, err.error);
    const msg = err.status === 401 ? 'Invalid API key — contact the site admin.'
              : err.status === 429 ? 'AI is rate-limited right now. Try again in a moment.'
              : `AI response failed: ${err.message}`;
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
});

// ============================================================
// AI QUESTION GENERATOR — admin endpoint
// ============================================================

const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5, // 5 generation requests per minute (each costs API credits)
  message: { error: 'Generation rate limit reached. Wait a moment.' }
});

app.post('/api/questions/generate', adminAuth, generateLimiter, async (req, res) => {
  const { level, difficulty, count = 5 } = req.body;

  const validLevels = ['AI Foundations','Data Preparation','Model Building','AI App Development','Deployment and Responsible AI'];
  const validDiffs  = ['Beginner','Intermediate','Advanced'];

  if (!validLevels.includes(level) || !validDiffs.includes(difficulty)) {
    return res.status(400).json({ error: 'Invalid level or difficulty.' });
  }
  if (!anthropic) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured on server.' });
  }

  const n = Math.min(Math.max(parseInt(count) || 5, 1), 10); // clamp 1–10

  const prompt = `Generate exactly ${n} multiple-choice trivia questions about "${level}" at "${difficulty}" level for an AI app development course.

Requirements:
- Each question tests a specific, factual concept relevant to AI/ML practitioners
- Four answer options (A, B, C, D) — only one is correct, option A is ALWAYS correct
- Options should be plausible but clearly distinguishable
- Explanation: 1-2 sentences explaining WHY option A is correct
- Hint: one sentence that guides thinking without giving the answer away
- Language difficulty should match: Beginner=plain English, Intermediate=some technical terms, Advanced=assume ML knowledge

Return ONLY a valid JSON array, no other text:
[
  {
    "question_text": "...",
    "option_a": "...",
    "option_b": "...",
    "option_c": "...",
    "option_d": "...",
    "correct_option": "A",
    "explanation": "...",
    "hint": "..."
  }
]`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw  = message.content[0].text.trim();
    // Extract JSON array from response (handle markdown code fences)
    const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const generated = JSON.parse(json);

    if (!Array.isArray(generated)) throw new Error('Response was not an array');

    // Insert as PENDING (status field) — admin approves before they go live
    const inserted = [];
    for (const q of generated) {
      if (!q.question_text || !q.option_a || !q.correct_option) continue;
      const id = await dbRun(
        `INSERT INTO questions (question_text,option_a,option_b,option_c,option_d,correct_option,level,difficulty,explanation,hint,status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [q.question_text, q.option_a, q.option_b||'', q.option_c||'', q.option_d||'',
         'A', level, difficulty, q.explanation||'', q.hint||'', 'pending']
      );
      inserted.push({ id, ...q, level, difficulty, status: 'pending' });
    }

    res.json({ generated: inserted.length, questions: inserted });
  } catch (err) {
    console.error('Question generation error:', err.message);
    res.status(500).json({ error: 'Failed to generate questions: ' + err.message });
  }
});

// GET /api/questions/pending — pending AI-generated questions awaiting approval (admin)
app.get('/api/questions/pending', adminAuth, async (req, res) => {
  res.json(await dbAll("SELECT * FROM questions WHERE status = 'pending' ORDER BY id DESC"));
});

// POST /api/questions/:id/approve — approve a pending question (admin)
app.post('/api/questions/:id/approve', adminAuth, async (req, res) => {
  await dbRun("UPDATE questions SET status = 'approved' WHERE id = ?", [req.params.id]);
  res.json({ message: 'Question approved and now live.' });
});

// POST /api/questions/:id/reject — reject a pending question (admin)
app.post('/api/questions/:id/reject', adminAuth, async (req, res) => {
  await dbRun('DELETE FROM questions WHERE id = ? AND status = ?', [req.params.id, 'pending']);
  res.json({ message: 'Question rejected and removed.' });
});

// ============================================================
// DAILY LEARNING HUB — lessons + AI trends (cached per day in Turso)
// ============================================================

// Helper: rotate through AI topic areas based on date seed
function dailyTopic(dateStr) {
  const topics = [
    'neural networks and how they learn',
    'natural language processing and how machines understand text',
    'computer vision and image recognition',
    'reinforcement learning and AI decision-making',
    'AI ethics, fairness, and bias',
    'large language models and how they work',
    'generative AI — images, music, and creativity',
    'AI in healthcare and medicine',
    'robotics and autonomous systems',
    'AI safety and alignment',
    'transformer architecture and attention mechanisms',
    'diffusion models and image generation',
    'retrieval-augmented generation (RAG)',
    'AI agents and tool use',
    'AI in business and productivity'
  ];
  const seed = dateStr.split('').reduce((n, c) => n + c.charCodeAt(0), 0);
  return topics[seed % topics.length];
}

// GET /api/daily-lesson — 3 micro-lessons, generated once per day, cached in DB
app.get('/api/daily-lesson', learnLimiter, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  // Serve from cache if already generated today
  const cached = await dbGet("SELECT content FROM daily_content WHERE date = ? AND type = 'lesson'", [today]);
  if (cached) return res.json(JSON.parse(cached.content));

  if (!anthropic) {
    return res.status(503).json({ error: 'AI not configured.', fallback: true });
  }

  const topic = dailyTopic(today);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1800,
      messages: [{
        role: 'user',
        content: `Generate exactly 3 bite-sized AI micro-lessons about "${topic}" for complete beginners.

Each lesson should be self-contained, educational, and feel fresh.
Use plain English — no unexplained jargon.

Return ONLY a valid JSON object:
{
  "topic": "${topic}",
  "lessons": [
    {
      "title": "Short catchy concept name (max 6 words)",
      "emoji": "one relevant emoji",
      "explanation": "2-3 sentences explaining the concept clearly in plain English",
      "real_world": "One real-world example most people already know (Netflix, Spotify, Google Maps etc.)",
      "fun_fact": "One surprising or counterintuitive fact about this concept"
    }
  ]
}`
      }]
    });

    const raw = message.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const data = JSON.parse(raw);
    if (!data.lessons || !Array.isArray(data.lessons)) throw new Error('Invalid response shape');

    // Cache for the rest of the day
    await dbRun(
      "INSERT OR REPLACE INTO daily_content (date, type, content) VALUES (?, 'lesson', ?)",
      [today, JSON.stringify(data)]
    );

    res.json(data);
  } catch (err) {
    console.error('Daily lesson error:', err.message);
    res.status(500).json({ error: 'Could not generate lessons: ' + err.message });
  }
});

// GET /api/ai-trends — top 3 AI stories from HackerNews, summarised by Claude, cached per day
app.get('/api/ai-trends', learnLimiter, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  // Serve from cache
  const cached = await dbGet("SELECT content FROM daily_content WHERE date = ? AND type = 'trend'", [today]);
  if (cached) return res.json(JSON.parse(cached.content));

  if (!anthropic) {
    return res.status(503).json({ error: 'AI not configured.', fallback: true });
  }

  try {
    // 1. Fetch top HN story IDs
    const hnTop = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
    const ids   = await hnTop.json();

    // 2. Fetch details for first 60 stories in parallel
    const stories = await Promise.all(
      ids.slice(0, 60).map(id =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json()).catch(() => null)
      )
    );

    // 3. Filter for AI-related stories by title keywords
    const AI_KEYWORDS = ['ai', 'llm', 'gpt', 'claude', 'gemini', 'mistral', 'openai', 'anthropic',
      'neural', 'machine learning', 'deep learning', 'generative', 'diffusion', 'transformer',
      'chatbot', 'model', 'training', 'inference', 'robotics', 'automation'];
    const aiStories = stories.filter(s =>
      s && s.title && AI_KEYWORDS.some(kw => s.title.toLowerCase().includes(kw))
    ).slice(0, 6);

    // 4. Build prompt — use real stories if found, otherwise ask Claude for curated picks
    let prompt;
    if (aiStories.length >= 2) {
      prompt = `Here are today's top AI-related stories trending on Hacker News:

${aiStories.map((s, i) => `${i + 1}. "${s.title}"${s.url ? ` — ${s.url}` : ''} (${s.score || 0} upvotes)`).join('\n')}

Summarise the 3 most interesting ones for a complete beginner. Avoid jargon.`;
    } else {
      prompt = `Share 3 of the most significant recent AI developments or breakthroughs that a beginner learning AI would find interesting and relevant in ${new Date().getFullYear()}. Focus on things that have happened in the last 6-12 months.`;
    }

    prompt += `

Return ONLY a valid JSON array with exactly 3 items:
[
  {
    "headline": "Short punchy title (max 10 words)",
    "emoji": "one relevant emoji",
    "plain_english": "2-3 sentences explaining this to a 15-year-old — no jargon",
    "why_it_matters": "One sentence on why this matters for AI's future",
    "source_url": "original URL or empty string"
  }
]`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw  = message.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error('Response was not an array');

    const result = {
      trends:   data,
      source:   aiStories.length >= 2 ? 'hackernews' : 'ai_curated',
      fallback: aiStories.length < 2,
      date:     today
    };

    // Cache for the rest of the day
    await dbRun(
      "INSERT OR REPLACE INTO daily_content (date, type, content) VALUES (?, 'trend', ?)",
      [today, JSON.stringify(result)]
    );

    res.json(result);
  } catch (err) {
    console.error('AI trends error:', err.message);
    res.status(500).json({ error: 'Could not fetch trends: ' + err.message });
  }
});

// ============================================================
// ADMIN PANEL (password-protected)
// ============================================================
app.get('/admin', adminAuth, (req, res) => res.sendFile(path.join(__dirname, 'admin', 'admin.html')));
app.use('/admin', adminAuth, express.static(path.join(__dirname, 'admin')));

// ============================================================
// STATIC FILE SERVING (game frontend)
// ============================================================
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// INIT — ensure tables exist and seed if empty
// ============================================================
async function initDb() {
  await createTables();
  await seedQuestions();
  console.log('✅ Database ready.');
}

// ── Start the HTTP server only when run directly (not imported by Vercel) ──
if (require.main === module) {
  initDb()
    .then(() => {
      app.listen(PORT, () => {
        console.log('');
        console.log('🚀 AI App Builder Challenge is running!');
        console.log(`   Game:  http://localhost:${PORT}`);
        console.log(`   Admin: http://localhost:${PORT}/admin  (password: ${ADMIN_PASSWORD === 'admin' ? 'admin [change via ADMIN_PASSWORD env var]' : '(set via ADMIN_PASSWORD)'})`);
        console.log('');
      });
    })
    .catch(err => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}

// Export for Vercel serverless runtime
module.exports = app;
