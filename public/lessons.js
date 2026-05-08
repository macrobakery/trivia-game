/* ============================================================
   lessons.js — AI Challenge Lesson Browser
   ============================================================ */

'use strict';

/* ──────────────────────────────────────────────────────────────
   CURRICULUM — 5 topics × 5 lessons
────────────────────────────────────────────────────────────── */

const CURRICULUM = [
  {
    id: 'foundations',
    title: 'AI Foundations',
    icon: '◐',
    color: 'accent',
    lessons: [
      {
        id: 'what-is-ai',
        title: 'What Is Artificial Intelligence?',
        duration: '3 min',
        intro: 'Artificial Intelligence is the science of making machines perform tasks that normally require human intelligence. Understanding what AI actually is — versus science fiction — is the essential first step before learning any technique.',
        points: [
          {
            heading: 'Narrow AI vs General AI',
            body: 'Every AI system today is Narrow AI: it is brilliant at one specific task (translating text, detecting tumours, playing chess) and completely helpless outside it. Artificial General Intelligence — a system that can reason flexibly across any domain like a human — does not yet exist and remains an open research problem debated across academia and industry.'
          },
          {
            heading: 'How AI Learns from Data, Not Rules',
            body: 'Traditional software runs explicit rules written by programmers. AI systems instead learn statistical patterns directly from large collections of examples. Feed a model thousands of labelled cat photos and it infers its own internal rules for "catness" — no programmer ever writes "if fur and pointy ears." This shift from hand-coded logic to learned patterns is what makes modern AI so powerful and so hard to explain.'
          },
          {
            heading: 'Three Core Branches: ML, NLP, and Computer Vision',
            body: 'Machine Learning teaches systems to predict outcomes from structured data. Natural Language Processing gives machines the ability to read, write, and converse in human language. Computer Vision lets machines interpret images and video — recognising objects, measuring distances, and detecting anomalies. Most real products blend all three: a self-driving car uses ML for decisions, CV to see the road, and NLP to understand voice commands.'
          },
          {
            heading: 'AI Is Pattern Recognition, Not Understanding',
            body: 'A language model that writes a compelling essay has not understood the topic — it has learned which tokens statistically follow which other tokens across billions of documents. This distinction matters enormously. AI can be confidently wrong, fail on simple edge cases that break its learned patterns, and produce output that sounds authoritative but is factually incorrect. Knowing this helps you build safer, more reliable AI applications.'
          }
        ],
        takeaway: 'AI is pattern recognition from data at scale — powerful for specific tasks, brittle outside its training distribution, and always distinct from human understanding.'
      },
      {
        id: 'machine-learning',
        title: 'Machine Learning: Teaching Computers to Learn',
        duration: '4 min',
        intro: 'Machine Learning is the engine inside most modern AI products. Rather than following fixed instructions, ML systems improve automatically by processing examples and adjusting their internal parameters to reduce mistakes.',
        points: [
          {
            heading: 'Supervised Learning',
            body: 'In supervised learning, every training example comes with the correct answer — called a label. The algorithm learns to map inputs to outputs by minimising the gap between its predictions and the true labels. Email spam filters, credit scoring models, and image classifiers are all supervised. The quality and size of your labelled dataset directly determines how good the model becomes — garbage in, garbage out.'
          },
          {
            heading: 'Unsupervised Learning',
            body: 'Unsupervised learning finds hidden structure in data that has no labels. Clustering algorithms group similar customers together without being told what the groups are. Dimensionality reduction techniques like PCA compress high-dimensional data into visualisable 2D maps. Anomaly detection flags unusual transactions on your credit card without ever being told what fraud looks like — it just knows when a data point is far from normal.'
          },
          {
            heading: 'Reinforcement Learning',
            body: 'Reinforcement learning trains an agent to take actions in an environment to maximise a cumulative reward signal. The agent explores, receives feedback (reward or penalty), and gradually learns which actions lead to better outcomes. RL powered AlphaGo, trained robotics arms to grasp objects, and optimised data-centre cooling. Its weakness: it needs a well-designed reward function, and poorly specified rewards produce agents that "game" the metric in unexpected ways.'
          },
          {
            heading: 'The Training Loop',
            body: 'All ML training follows the same cycle: (1) make a prediction with the current model weights, (2) measure the error using a loss function, (3) compute how each weight contributed to the error via backpropagation, (4) nudge every weight in the direction that reduces error via gradient descent, (5) repeat for thousands or millions of examples. Each full pass through the dataset is called an epoch. The model improves iteratively, not through any single flash of insight.'
          }
        ],
        takeaway: 'Machine learning automates the discovery of patterns through iterative feedback loops — the training loop of predict, measure, and adjust is the heartbeat of every ML system.'
      },
      {
        id: 'deep-learning',
        title: 'Deep Learning & Neural Networks',
        duration: '4 min',
        intro: 'Deep learning is a subfield of machine learning that uses layered networks of artificial neurons to learn representations of data at multiple levels of abstraction. It is the technology behind virtually every state-of-the-art AI system in use today.',
        points: [
          {
            heading: 'What Is an Artificial Neuron?',
            body: 'Each neuron receives a vector of numerical inputs, multiplies each by a learned weight, sums the results, adds a bias term, then passes the total through a non-linear activation function (like ReLU or sigmoid) to produce its output. Individually, a neuron is trivially simple — it is their massive parallel composition that gives neural networks their expressive power. A typical modern network may contain billions of such neurons.'
          },
          {
            heading: 'Layers: Input, Hidden, and Output',
            body: 'The input layer accepts raw data — pixel values, word tokens, sensor readings. Hidden layers progressively transform that raw signal into increasingly abstract representations: early layers in an image network detect edges, middle layers detect shapes, later layers detect objects. The output layer converts the final representation into the desired prediction — a probability distribution over classes, a generated token, or a continuous value. "Deep" simply means many hidden layers.'
          },
          {
            heading: 'The Transformer Architecture',
            body: 'Introduced in the 2017 paper "Attention Is All You Need," the Transformer replaced recurrent networks for language tasks. Its core innovation is self-attention: a mechanism that lets every position in a sequence directly attend to every other position, capturing long-range dependencies in a single computation. All large language models — GPT, Claude, Gemini — are Transformer variants. The architecture also dominates vision, audio, and protein-folding applications.'
          },
          {
            heading: 'Why Deep Learning Beats Traditional ML',
            body: 'Traditional ML requires human experts to hand-engineer features — extracting edges before feeding pixels to a classifier, for instance. Deep learning learns its own features end-to-end from raw data, removing this bottleneck. Given enough data and compute, deep networks discover representations that no human engineer would have designed. The tradeoff: they require far more data, compute, and energy to train than classical methods, and their learned features are much harder to interpret.'
          }
        ],
        takeaway: 'Deep learning stacks learned transformations layer by layer, automatically discovering the right representations without hand-engineered features — making it the dominant paradigm for perception and language.'
      },
      {
        id: 'model-training',
        title: 'How AI Models Are Trained',
        duration: '4 min',
        intro: 'Training a large AI model is one of the most computationally expensive activities in modern technology. Understanding the mechanics helps you make smarter decisions about when to train from scratch, fine-tune, or simply call an existing API.',
        points: [
          {
            heading: 'The Loss Function',
            body: 'A loss function is a mathematical formula that measures how wrong the model is — it takes the model\'s prediction and the true target, and returns a single number representing error. Cross-entropy loss is common for classification (it penalises confident wrong answers heavily). Mean squared error suits regression. Choosing the right loss function is an often-overlooked design decision that directly shapes what the model optimises for and, crucially, what it ignores.'
          },
          {
            heading: 'Gradient Descent',
            body: 'Gradient descent is the optimisation algorithm that actually changes the model weights. It computes the gradient of the loss with respect to every weight — a direction vector pointing uphill. Moving opposite to that direction (downhill) reduces loss. The learning rate controls step size: too large and training oscillates; too small and it converges glacially. Adam and AdamW are adaptive variants that adjust the learning rate per-parameter and dominate modern practice.'
          },
          {
            heading: 'Epochs and Batch Size',
            body: 'An epoch is one complete pass through the entire training dataset. Training typically requires dozens to hundreds of epochs. Rather than updating weights once per epoch, we split data into mini-batches (commonly 32–512 examples) and update after each batch — this is Stochastic Gradient Descent. Smaller batches add beneficial noise that can improve generalisation but are slower to process; larger batches train faster on GPUs but may converge to sharper, less generalisable minima.'
          },
          {
            heading: 'Why Compute Cost Is So High',
            body: 'Training GPT-4 reportedly cost over $100 million in compute. Each forward and backward pass through a multi-billion parameter model involves trillions of floating-point operations. Models are parallelised across thousands of GPUs using specialised hardware interconnects. Memory bandwidth — moving tensors between GPU memory and compute units — is often the real bottleneck, not raw FLOPS. This cost concentration means a handful of companies control cutting-edge model training, creating significant strategic and ethical implications.'
          }
        ],
        takeaway: 'Training is an iterative optimisation process — loss measures error, gradients point toward improvement, and gradient descent walks the model downhill across trillions of parameters.'
      },
      {
        id: 'ai-ethics',
        title: 'AI Ethics & Bias',
        duration: '4 min',
        intro: 'Building AI responsibly means understanding how models inherit the flaws of their creators, their data, and their deployment contexts. Ethics is not a checkbox at the end of development — it must be embedded throughout the design process.',
        points: [
          {
            heading: 'Bias from Training Data',
            body: 'If a hiring model is trained on historical decisions made by a biased workforce, it learns to replicate that bias — down-ranking women\'s CVs for technical roles, for example. The model is not "choosing" to be unfair; it is faithfully reproducing patterns in data. Bias auditing involves disaggregating model performance across demographic groups and measuring disparity. Fixing it may require resampling data, adjusting labels, or applying algorithmic fairness constraints — each with its own tradeoffs.'
          },
          {
            heading: 'The Explainability Problem',
            body: 'A neural network with billions of parameters has no human-readable explanation for why it made any specific decision. This is a critical problem in high-stakes domains: a loan officer can explain a rejection; a deep network cannot. Explainability techniques like SHAP (SHapley Additive exPlanations) and LIME approximate local explanations, but they are proxies — not ground truth. Regulators in healthcare and finance increasingly require explainable decisions, creating real tension with model capability.'
          },
          {
            heading: 'Hallucinations',
            body: 'Language models hallucinate: they generate plausible-sounding statements that are factually wrong. A model asked about a niche legal case may confidently fabricate case names and citations. This happens because the model is optimised to generate fluent text that fits the context of its training distribution, not to retrieve verified facts. Mitigations include Retrieval-Augmented Generation (feeding the model real sources at query time) and output verification pipelines — but hallucination cannot yet be fully eliminated.'
          },
          {
            heading: 'The Alignment Challenge',
            body: 'Alignment is the problem of ensuring an AI system pursues the goals humans actually want, not a misspecified proxy. A model trained to maximise engagement might learn to promote outrage. A reward-optimised agent might find loopholes rather than solve the real problem. As models become more capable and more autonomous, the stakes of misalignment grow. Techniques like RLHF (Reinforcement Learning from Human Feedback) and Constitutional AI are current approaches, but no complete solution exists.'
          }
        ],
        takeaway: 'AI systems inherit and amplify human biases, cannot fully explain themselves, and optimise for what they\'re measured on — not necessarily what we want — making ethics a core engineering concern.'
      },
      {
        id: 'gen-vs-pred-ai',
        title: 'Generative AI vs Predictive AI',
        duration: '3 min',
        intro: 'Two families of AI dominate today\'s products, and they solve fundamentally different problems. Knowing which one you need saves months of wasted engineering and millions in compute.',
        points: [
          {
            heading: 'Predictive AI: Choose from a Set',
            body: 'Predictive models output a label or a number from a fixed range — spam or not, churn risk between 0 and 1, predicted house price in dollars. They are built with structured data and well-defined targets. Logistic regression, gradient-boosted trees, and traditional neural classifiers are all predictive. They\'re fast, cheap to run, easy to evaluate, and dominate fraud detection, recommendations, and forecasting.'
          },
          {
            heading: 'Generative AI: Create Something New',
            body: 'Generative models output novel content — text, images, audio, video, code. They sample from a learned distribution rather than picking from a fixed set. GPT, Claude, Stable Diffusion, and DALL·E are generative. They unlock totally new product categories — drafting emails, designing logos, writing code — but cost more per call, can hallucinate, and are much harder to evaluate quantitatively.'
          },
          {
            heading: 'When to Use Which',
            body: 'Use predictive AI when the answer space is small and well-defined: yes/no, one of N categories, a single number. Use generative AI when the output is open-ended creative content. Many real products combine both — a customer-support tool might use predictive AI to classify ticket urgency, then generative AI to draft a reply. The classification step is fast and cheap; the generation step is slower but flexible.'
          },
          {
            heading: 'Why Generative AI Feels Like Magic',
            body: 'Generative models trained on internet-scale data exhibit emergent abilities the engineers never explicitly programmed — translation, summarisation, code generation, even basic reasoning. These abilities emerge once models pass certain parameter and data thresholds. This is why a single LLM can power dozens of different products, while a predictive model is locked to its specific labelled task.'
          }
        ],
        takeaway: 'Predictive AI picks from a fixed set of answers; generative AI creates novel content. Match the tool to the problem — and recognise that one well-prompted generative model can replace many narrow predictive ones.'
      },
      {
        id: 'ai-history',
        title: 'A Brief History of AI',
        duration: '4 min',
        intro: 'AI didn\'t arrive in 2022 with ChatGPT. It has gone through seven decades of breakthroughs and "AI winters." Understanding the arc helps you place current excitement in context — and predict where the field goes next.',
        points: [
          {
            heading: 'The Symbolic Era (1956–1980s)',
            body: 'AI was born at the 1956 Dartmouth Conference, where John McCarthy coined the term. Early researchers believed intelligence could be coded as symbolic rules — if-then logic and search trees. Expert systems like MYCIN diagnosed infections; chess engines used minimax search. The approach hit a wall: real-world knowledge is too messy and too vast to encode as rules. Funding collapsed in the first "AI winter" of the 1970s.'
          },
          {
            heading: 'The Statistical Turn (1990s–2000s)',
            body: 'Researchers shifted from coding rules to learning patterns from data. Support Vector Machines, Random Forests, and shallow neural networks dominated. IBM\'s Deep Blue beat Kasparov at chess in 1997 using massive search plus tuned heuristics, not learning. The web exploded with data, but compute was still limited — most ML happened on single CPUs and tiny datasets compared to today.'
          },
          {
            heading: 'The Deep Learning Revolution (2012–2017)',
            body: 'In 2012, AlexNet shocked the field by winning the ImageNet image-classification challenge with a deep convolutional network — cutting error rates by half overnight. GPUs proved essential for training. Deep learning quickly conquered speech recognition, machine translation, and game playing — DeepMind\'s AlphaGo beat the world Go champion in 2016. The approach was clearly different: learn features end-to-end from raw data.'
          },
          {
            heading: 'The Transformer Era (2017–Today)',
            body: 'The 2017 "Attention Is All You Need" paper introduced the Transformer architecture. By 2020, GPT-3 showed that scaling Transformers to hundreds of billions of parameters produced emergent abilities. ChatGPT in November 2022 made the technology accessible to everyone, kicking off the current wave. Today\'s frontier is multi-modal models that handle text, images, audio, and video together — and AI agents that can use tools and complete multi-step tasks.'
          }
        ],
        takeaway: 'AI\'s history is a cycle of overpromising, underdelivering, and rebooting around new ideas — symbolic rules, then statistics, then deep learning, then Transformers. Each era stood on the previous one\'s shoulders.'
      }
    ]
  },

  {
    id: 'data-prep',
    title: 'Data Preparation',
    icon: '◇',
    color: 'cyan',
    lessons: [
      {
        id: 'data-foundation',
        title: 'Why Data Is the Foundation of AI',
        duration: '3 min',
        intro: 'Data is not just the fuel for AI — it is the architecture. The quantity, quality, and representativeness of your data determines the upper bound of what any model can achieve, regardless of the algorithm\'s sophistication.',
        points: [
          {
            heading: 'The Data-Algorithm Tradeoff',
            body: 'A simple logistic regression model trained on ten million high-quality examples often outperforms a deep neural network trained on one hundred thousand noisy ones. This is consistently demonstrated in industry. More data usually beats a cleverer algorithm. The practical implication: before spending weeks tuning a model architecture, invest time in acquiring more labelled examples or cleaning existing data. The returns are typically higher and more predictable.'
          },
          {
            heading: 'Data Quality Dimensions',
            body: 'Quality is multi-dimensional. Accuracy: are the values correct? Completeness: are there missing fields? Consistency: does the same entity appear with the same format everywhere? Timeliness: is the data recent enough to reflect current patterns? A model trained on customer data from five years ago may not reflect today\'s behaviour. Each quality dimension requires its own measurement approach, and degradation in any one can silently degrade model performance after deployment.'
          },
          {
            heading: 'Representativeness and Distribution Shift',
            body: 'A model is only as representative as its training data. If you train a medical diagnosis model on data from urban hospitals, it may fail on patients from rural areas with different disease prevalence and treatment patterns. When the real-world data distribution differs from the training distribution, this is called distribution shift, and it is one of the leading causes of AI failures in production. Always ask: who is not represented in my training data?'
          },
          {
            heading: 'Data Flywheel',
            body: 'The best AI companies build data flywheels: more users generate more interactions, which produce more labelled data, which trains better models, which attract more users. Google, Meta, and Amazon have moats built largely on data volume. For builders of new products, this means focusing early on data collection infrastructure — logging user interactions, building feedback mechanisms, and designing features that passively generate labelled examples. The model is temporary; the data asset is durable.'
          }
        ],
        takeaway: 'The quality, quantity, and representativeness of training data determine a model\'s ceiling — better data consistently outperforms better algorithms on fixed data.'
      },
      {
        id: 'collecting-data',
        title: 'Collecting & Sourcing Data',
        duration: '4 min',
        intro: 'Before you can train or fine-tune any model, you need data. Where it comes from, how it was created, and what rights you have over it shape every decision downstream — from model capability to legal compliance.',
        points: [
          {
            heading: 'Public Datasets and Open Repositories',
            body: 'Hugging Face Datasets, Kaggle, UCI ML Repository, and government open-data portals provide thousands of curated datasets. These are invaluable for benchmarking and initial experimentation but rarely match your specific domain perfectly. Always check the licence: datasets like ImageNet have academic-only terms, while others permit commercial use. Reading the dataset card and original paper before training is essential — many popular datasets contain known biases and errors that are well-documented.'
          },
          {
            heading: 'Web Scraping and Crawling',
            body: 'Much of the data behind large language models was scraped from the public web using tools like Common Crawl. Building your own scraper requires balancing crawl frequency against server load, respecting robots.txt, and complying with terms of service. Legal risk is real: several LLM providers face lawsuits over scraped copyrighted content. For niche domains — legal documents, scientific papers, proprietary knowledge — targeted scraping of permitted sources can provide a significant competitive advantage.'
          },
          {
            heading: 'Synthetic Data Generation',
            body: 'Synthetic data — examples generated by another AI system rather than collected from humans — is increasingly used to bootstrap models when real data is scarce. GPT-4 generated much of the training data for smaller instruction-following models like Alpaca. For structured data like tabular records, tools like SDV (Synthetic Data Vault) generate privacy-preserving synthetic rows. Key risk: if synthetic data systematically under-represents edge cases or encodes the generator\'s own errors, these flaws are amplified in the trained model.'
          },
          {
            heading: 'Human Annotation and Labelling',
            body: 'Many tasks require human judgement to label: "Is this text toxic?", "Which response is more helpful?", "Is this medical image benign?" Platforms like Scale AI, Labelbox, and Amazon Mechanical Turk provide annotation at scale. Quality control is the central challenge: annotator agreement (measured by Cohen\'s Kappa) varies widely across tasks. Annotation guidelines, training examples, and inter-annotator calibration are the levers. The cost of poor annotation compounds every time the mislabelled data is used in training.'
          }
        ],
        takeaway: 'Data sourcing is a strategic and legal decision — balance between public datasets, scraping, synthetic generation, and human annotation defines both your model\'s capability and your compliance exposure.'
      },
      {
        id: 'cleaning-data',
        title: 'Cleaning & Preprocessing Data',
        duration: '5 min',
        intro: 'Raw data is almost never ready for a model. Cleaning transforms messy, inconsistent, real-world data into a form that a learning algorithm can process — and it typically consumes 60–80% of a data scientist\'s time on any project.',
        points: [
          {
            heading: 'Handling Missing Values',
            body: 'Missing data falls into three categories: Missing Completely At Random (MCAR — safe to drop rows), Missing At Random (MAR — missingness depends on observed variables, safe to impute), and Missing Not At Random (MNAR — missingness reveals information, e.g. patients refusing to answer about drug use). Common imputation strategies: mean/median imputation (fast but distorts distributions), k-NN imputation (slower, more accurate), and model-based imputation. Deleting rows with missing values is often the wrong default.'
          },
          {
            heading: 'Outlier Detection and Treatment',
            body: 'Outliers skew statistical summaries and can dominate gradient updates. Identify them with Z-scores (flag values more than 3 standard deviations from the mean), IQR fences (1.5× the interquartile range), or unsupervised anomaly detectors like Isolation Forest. Treatment options: removal (dangerous if outliers are valid edge cases), capping (winsorising to the 1st/99th percentile), or transformation (log-scaling compresses extreme values for right-skewed distributions). Always inspect outliers manually — they are often the most informative examples.'
          },
          {
            heading: 'Normalisation and Standardisation',
            body: 'Most ML algorithms are sensitive to scale. Min-max normalisation rescales values to [0, 1] and is suitable when you know the feature\'s range and the distribution is roughly uniform. Standardisation (z-score normalisation) transforms data to zero mean and unit variance and works better for normally distributed features and distance-based algorithms. Tree-based models (Random Forests, XGBoost) are invariant to monotone transformations and generally do not require scaling — applying it anyway is harmless but unnecessary.'
          },
          {
            heading: 'Text Preprocessing for NLP',
            body: 'Raw text requires a specialised pipeline. Lowercasing, removing punctuation, and stripping HTML tags are basic steps. Tokenisation splits text into units the model sees — modern Byte-Pair Encoding (BPE) tokenisers handle arbitrary text including typos and new words. Stopword removal and stemming were essential for classical NLP but are less important for Transformer models, which learn contextual meaning. For production pipelines, consistency is paramount: training and inference must apply identical preprocessing or predictions degrade silently.'
          }
        ],
        takeaway: 'Cleaning is not optional preprocessing — it is the difference between a model that works and one that confidently amplifies noise from messy real-world data.'
      },
      {
        id: 'feature-engineering',
        title: 'Feature Engineering',
        duration: '5 min',
        intro: 'Feature engineering is the art of transforming raw data into representations that make it easier for a model to learn the patterns you care about. Even in the deep learning era, thoughtful feature design separates good models from great ones, especially on structured tabular data.',
        points: [
          {
            heading: 'Creating Interaction Features',
            body: 'A feature on its own may have weak predictive power, but combined with another it becomes informative. The ratio of loan-amount to annual-income (debt-to-income ratio) predicts default far better than either variable alone. Polynomial features and cross-products capture non-linear relationships that a linear model cannot learn otherwise. The challenge is the combinatorial explosion: for 100 features, there are 4,950 possible pairwise interactions. Domain knowledge, not brute-force search, guides which interactions matter.'
          },
          {
            heading: 'Encoding Categorical Variables',
            body: 'Algorithms work on numbers, not strings. One-hot encoding creates binary columns for each category value — suitable for low-cardinality features with no ordering. Ordinal encoding assigns integers to ordered categories (Small=1, Medium=2, Large=3). Target encoding replaces a category with the mean of the target variable within that category — powerful but prone to target leakage if not applied with cross-validation. For very high-cardinality features (postal codes, user IDs), embeddings learned during training outperform all hand-coded approaches.'
          },
          {
            heading: 'Date and Time Features',
            body: 'A raw timestamp is almost useless. Extracting components — hour of day, day of week, week of year, is_weekend, days_since_last_purchase — turns a single column into a rich feature set capturing periodicity, seasonality, and recency. Cyclical encoding (sine/cosine transformation) represents circular features like hours or months so that 23:00 and 01:00 appear close together — which they are conceptually, but integer encoding would place them far apart. Time since a reference event captures recency more effectively than absolute timestamps.'
          },
          {
            heading: 'Feature Selection and Importance',
            body: 'More features are not always better. Irrelevant features add noise, slow training, and risk overfitting. Filter methods (correlation, mutual information) rank features before training. Wrapper methods (recursive feature elimination) train the model iteratively, removing the weakest feature each round. Embedded methods (LASSO regularisation, tree-based feature importance) perform selection during training. SHAP values provide model-agnostic, theoretically grounded importance scores. Reducing from 500 to 50 features often improves accuracy while dramatically reducing inference cost.'
          }
        ],
        takeaway: 'Feature engineering encodes domain knowledge into the data representation, giving models a head start on patterns they might take far longer to discover from raw inputs alone.'
      },
      {
        id: 'train-val-test',
        title: 'Train / Validation / Test Splits',
        duration: '4 min',
        intro: 'How you divide your data determines whether your performance metrics reflect reality or fantasy. Correct splitting practice is one of the most important — and most commonly violated — disciplines in applied machine learning.',
        points: [
          {
            heading: 'Why You Need Three Sets',
            body: 'The training set teaches the model. The validation set guides your hyperparameter choices and architecture decisions — every time you look at validation metrics and adjust the model, you are indirectly fitting to it. The test set is a sealed envelope, used exactly once, to estimate real-world performance. Without a separate test set, you have no unbiased estimate of how your model will perform on data it has never influenced. A common mistake: treating a separate held-out set as if it were truly unseen when you have already used it to compare models.'
          },
          {
            heading: 'Stratified Splitting',
            body: 'Random splitting can, by chance, concentrate rare classes in one split. Stratified splitting ensures each split contains proportional representation of each class. For a fraud detection dataset where 0.1% of examples are fraud, a 10,000-example validation set should contain approximately 10 fraud examples — not zero, which a random split might produce. For regression problems, stratification can be approximated by bucketing the target and then stratifying on buckets. Sklearn\'s train_test_split supports stratification natively via the stratify parameter.'
          },
          {
            heading: 'Cross-Validation',
            body: 'When data is scarce, a single validation split is unreliable — performance varies significantly depending on which examples land in each split. K-fold cross-validation partitions data into K subsets, training K models each using K-1 folds for training and one for validation, then averaging performance. 5-fold and 10-fold are standard. Stratified K-fold maintains class balance in each fold. Leave-one-out cross-validation (LOOCV) is the extreme, used when data is very small. The tradeoff: K× the compute cost for K× more reliable estimates.'
          },
          {
            heading: 'Temporal Splits for Time-Series Data',
            body: 'Random splitting is wrong for time-series data. If you randomly pull validation examples from throughout a time series, the model can see future information during training — a form of data leakage that produces unrealistically optimistic metrics. Always split temporally: train on the past, validate on an immediately subsequent window, test on the most recent data. Walk-forward validation mimics production: repeatedly retrain on everything up to time T, predict T+1, then advance T. The performance estimate from walk-forward is the most honest available for time-series models.'
          }
        ],
        takeaway: 'Correct data splitting is how you tell the truth to yourself — the test set is sacred, temporal leakage is insidious, and cross-validation is your ally when data is limited.'
      },
      {
        id: 'data-augmentation',
        title: 'Data Augmentation & Synthetic Data',
        duration: '4 min',
        intro: 'Real labelled data is expensive — sometimes impossible — to collect at scale. Data augmentation and synthetic generation let you stretch the data you have, or invent new data that didn\'t exist before. Used well, they unlock training runs that would otherwise be impossible.',
        points: [
          {
            heading: 'Augmentation: Cheap Variants of Real Data',
            body: 'Image augmentation rotates, crops, flips, blurs, or recolours real photos to teach a model that the same object can appear in many forms. Text augmentation paraphrases sentences, swaps synonyms, or back-translates through another language. Audio augmentation adds noise, shifts pitch, or trims silence. Each technique multiplies your effective dataset size for free, and in computer vision routinely halves the data needed to reach a target accuracy.'
          },
          {
            heading: 'Synthetic Data: Generating from Scratch',
            body: 'When real data is scarce, regulated, or private, you can generate synthetic examples. Game engines render perfect labelled images of pedestrians for self-driving training. GANs produce realistic faces of people who don\'t exist. Modern LLMs synthesise training questions for fine-tuning smaller models. Synthetic data shines for rare events — fraud, accidents, edge-case medical conditions — that you\'ll never collect enough of in the wild.'
          },
          {
            heading: 'The Distribution-Shift Trap',
            body: 'Synthetic data must match the real-world distribution your model will face in production. A model trained only on rendered images of pedestrians may fail on dimly lit night photos. The most common pitfall is "synthetic-to-real gap": your model overfits the artefacts of the generator (lighting tells, GAN fingerprints) instead of the real signal. Always validate on a held-out real dataset, even if training is mostly synthetic.'
          },
          {
            heading: 'Augmentation as Regularisation',
            body: 'Augmentation isn\'t just about more data — it acts as a regulariser, forcing the model to learn invariances. A classifier trained with random crops cannot rely on absolute pixel positions. A model trained with paraphrased text cannot memorise exact wording. This naturally improves generalisation and reduces overfitting, which is why even data-rich projects benefit from aggressive augmentation pipelines.'
          }
        ],
        takeaway: 'Augmentation multiplies real data through transformations; synthetic data invents it from scratch. Both stretch your dataset and act as regularisation — but only if the generated examples reflect the distribution you\'ll actually see in production.'
      },
      {
        id: 'data-privacy-pii',
        title: 'Data Privacy & PII Handling',
        duration: '4 min',
        intro: 'AI systems trained on personal data carry real legal and ethical risk. Privacy isn\'t a step you bolt on at the end — it\'s a design constraint that shapes every part of your data pipeline.',
        points: [
          {
            heading: 'What Counts as PII',
            body: 'Personally Identifiable Information includes obvious fields — name, email, phone, ID number — and surprisingly powerful indirect identifiers. A combination of birth date, postcode, and gender uniquely identifies most individuals in many countries. Voice recordings, walking patterns, and even typing rhythm can be personally identifying. Treat any field that, alone or combined, narrows a record to a single person as PII.'
          },
          {
            heading: 'Anonymisation Techniques',
            body: 'Hashing, generalisation (binning ages into ranges), and k-anonymity (ensuring each record looks like at least k-1 others) are common defences. Differential privacy adds calibrated random noise to query results, with mathematical guarantees that any one person\'s contribution stays hidden. Beware naive anonymisation: removing names from a dataset doesn\'t prevent linkage attacks if other fields can be cross-referenced with public sources.'
          },
          {
            heading: 'Memorisation in Trained Models',
            body: 'Large language models can memorise and verbatim regurgitate training data, including PII. Researchers have extracted real email addresses, phone numbers, and even passwords from models trained on web crawls. Mitigations include training-data deduplication, output filtering, and differential-privacy fine-tuning. For regulated domains, never train directly on raw PII — sanitise first.'
          },
          {
            heading: 'Regulatory Landscape',
            body: 'GDPR (EU), CCPA (California), HIPAA (US healthcare), and PIPL (China) all impose specific rules on AI systems handling personal data — including the right to explanation, the right to erasure, and limits on automated decision-making. Get a lawyer involved early on any product that touches health, finance, or children\'s data. The cost of compliance up front is always lower than the cost of a fine or breach later.'
          }
        ],
        takeaway: 'PII is broader than you think and harder to anonymise than you\'d hope. Build privacy in by design — sanitise before training, audit for memorisation, and consult legal expertise on regulated domains.'
      }
    ]
  },

  {
    id: 'model-building',
    title: 'Model Building',
    icon: '◈',
    color: 'green',
    lessons: [
      {
        id: 'supervised-unsupervised',
        title: 'Supervised vs Unsupervised Learning',
        duration: '4 min',
        intro: 'The type of learning paradigm you choose depends on whether your data is labelled, what kind of insight you need, and how you will measure success. Choosing the right paradigm early prevents expensive rework later in a project.',
        points: [
          {
            heading: 'When to Use Supervised Learning',
            body: 'Supervised learning is appropriate when you have labelled examples of the output you want and need to generalise that mapping to new inputs. Spam classification, credit scoring, medical diagnosis, sentiment analysis — all have clear input-output pairs that humans can label. The quality of supervision defines the quality ceiling. Weak or noisy labels require label smoothing, confident learning, or noise-robust loss functions. Supervised models are easier to evaluate: if you know the right answer, you can measure how often the model gets it right.'
          },
          {
            heading: 'When to Use Unsupervised Learning',
            body: 'Unsupervised learning works when labels are unavailable, prohibitively expensive to collect, or when you are exploring unknown structure in data. Customer segmentation, topic modelling, anomaly detection, and data compression are natural fits. The difficulty is evaluation: without ground truth, assessing whether clusters are meaningful requires domain expertise and qualitative judgement. Silhouette score and Davies-Bouldin index quantify cluster cohesion and separation, but they cannot tell you whether the clusters are actionable for your business problem.'
          },
          {
            heading: 'Semi-Supervised Learning',
            body: 'Most real datasets have a small labelled subset and a large unlabelled pool — labelling is expensive, unlabelled data is cheap. Semi-supervised learning exploits both. Pseudo-labelling trains on labelled data, labels the high-confidence unlabelled predictions, then retrains on the augmented set. Consistency regularisation trains the model to give similar predictions for the same input under different augmentations. Large language models pre-trained on unlabelled text and then fine-tuned on small labelled sets are the most successful example of this paradigm in practice.'
          },
          {
            heading: 'Self-Supervised Learning',
            body: 'Self-supervised learning generates its own supervision from the structure of the data. BERT learns language by predicting masked tokens — the unlabelled text itself creates the training signal. GPT predicts the next token. Vision models can predict rotated or cropped versions of images. This paradigm is why large language models can be pre-trained on internet-scale text without any human labels. The learned representations encode surprisingly rich world knowledge that can be transferred to downstream tasks with minimal labelled fine-tuning data.'
          }
        ],
        takeaway: 'The right learning paradigm hinges on label availability and your evaluation strategy — supervised for defined outputs, unsupervised for discovery, self-supervised for leveraging massive unlabelled data.'
      },
      {
        id: 'regression-classification',
        title: 'Regression & Classification',
        duration: '4 min',
        intro: 'Regression and classification are the two most common supervised learning problem types. Every prediction problem maps to one of them, and understanding their mechanics helps you select algorithms and interpret outputs correctly.',
        points: [
          {
            heading: 'Linear and Logistic Regression',
            body: 'Linear regression models a continuous output as a weighted sum of inputs: ŷ = Xw + b. It is interpretable — each weight is the change in output per unit change in the corresponding input — and fast to train. Logistic regression applies a sigmoid function to produce a probability between 0 and 1, making it suitable for binary classification. Both are regularised in practice: Ridge (L2) penalises large weights to reduce overfitting; Lasso (L1) drives some weights to zero, performing implicit feature selection. These two models should always be your baseline before trying anything more complex.'
          },
          {
            heading: 'Multi-class Classification Strategies',
            body: 'Binary classifiers produce a yes/no decision. Multi-class problems — classifying news articles into ten topics, diagnosing one of twenty diseases — require extension. One-vs-Rest trains one binary classifier per class, classifying "is this class A or not?" for each class. One-vs-One trains a classifier for every pair of classes and takes a majority vote. Softmax regression generalises logistic regression directly to multiple classes by outputting a probability distribution that sums to 1. Deep neural networks with a softmax output layer handle multi-class natively.'
          },
          {
            heading: 'Choosing a Loss Function',
            body: 'Loss functions encode what "wrong" means for your problem. Mean Squared Error penalises large errors quadratically — one prediction off by 10 contributes 100× more to the loss than one off by 1. This is appropriate when large errors are genuinely worse. Mean Absolute Error is robust to outliers. Cross-entropy loss is the standard for classification — it penalises confident wrong predictions heavily and is the correct choice when calibrated probability outputs matter. Huber loss combines the best of MSE and MAE: quadratic for small errors, linear for large ones.'
          },
          {
            heading: 'Reading Output Probabilities',
            body: 'A classifier predicting 0.87 probability for "cat" is not 87% certain it is a cat in a human sense — it is saying "across all examples in my training distribution that produced this score, 87% were cats." Calibration measures how well predicted probabilities match empirical frequencies. A well-calibrated model is right 70% of the time when it says 0.70. Reliability diagrams and Expected Calibration Error (ECE) quantify this. Models like neural networks are notoriously overconfident. Temperature scaling is a simple, effective post-hoc calibration technique.'
          }
        ],
        takeaway: 'Regression predicts quantities, classification predicts categories — in both cases, your choice of loss function, regularisation, and calibration approach determines whether the model\'s outputs are trustworthy in production.'
      },
      {
        id: 'trees-forests',
        title: 'Decision Trees & Random Forests',
        duration: '5 min',
        intro: 'Tree-based models are workhorses of real-world ML on structured data. From medical risk scoring to fraud detection, they consistently outperform linear models on tabular tasks and remain highly competitive even against deep learning for non-image, non-text data.',
        points: [
          {
            heading: 'How Decision Trees Work',
            body: 'A decision tree learns a series of if-then rules by recursively partitioning the feature space. At each node it finds the feature and threshold that best separates the data according to an impurity measure — Gini impurity for classification, variance reduction for regression. The resulting tree is human-readable: you can trace any prediction to a sequence of explainable rules. The weakness is overfitting: an unconstrained tree memorises the training data, creating many tiny leaf nodes. Max depth, minimum samples per leaf, and minimum impurity decrease are the key regularisation hyperparameters.'
          },
          {
            heading: 'Bootstrap Aggregation (Bagging)',
            body: 'A single decision tree has high variance — small changes in training data produce very different trees. Random Forests reduce this variance through bagging: training hundreds of trees on different bootstrap samples (random subsets of the training data drawn with replacement) and averaging their predictions. Each split also considers only a random subset of features, decorrelating the trees. The ensemble\'s prediction is far more stable than any individual tree. As a rule, the more diverse the individual trees, the stronger the forest — diversity is the key mechanism, not just the number of trees.'
          },
          {
            heading: 'Gradient Boosted Trees (XGBoost, LightGBM)',
            body: 'Boosting takes a different approach: trees are added sequentially, each one trained to correct the errors of the ensemble so far. XGBoost and LightGBM are optimised implementations that dominate Kaggle competitions and production ML on tabular data. They incorporate L1/L2 regularisation, handle missing values natively, and support GPU training. LightGBM grows trees leaf-wise rather than level-wise, making it faster on large datasets. The main hyperparameters are n_estimators, learning_rate, max_depth, and min_child_weight — these interact and should be tuned together.'
          },
          {
            heading: 'Feature Importance from Trees',
            body: 'Tree-based models provide built-in feature importance scores based on how much each feature reduces impurity across all splits in the ensemble. This is fast and informative but has known biases: high-cardinality features appear more important simply because there are more potential split points. Permutation importance — measuring how much model performance drops when a feature\'s values are randomly shuffled — is a more reliable alternative. SHAP (SHapley Additive exPlanations) values from TreeSHAP provide exact, theoretically grounded feature attributions for individual predictions, not just global averages.'
          }
        ],
        takeaway: 'Decision trees are interpretable but overfit; ensembles like Random Forests and gradient boosted trees combine many trees to achieve robust, state-of-the-art accuracy on structured data.'
      },
      {
        id: 'model-evaluation',
        title: 'Evaluating Model Performance',
        duration: '4 min',
        intro: 'A model\'s performance is only meaningful relative to the problem it solves and the data it was tested on. Knowing which metrics matter for your specific context — and which can be gamed — is what separates rigorous ML from misleading benchmarks.',
        points: [
          {
            heading: 'Accuracy, Precision, Recall, and F1',
            body: 'Accuracy (correct predictions / total) is intuitive but misleading when classes are imbalanced — a model that always predicts "no fraud" is 99.9% accurate on a fraud dataset where 0.1% are fraudulent. Precision is the fraction of positive predictions that are actually positive; recall is the fraction of actual positives that the model finds. F1-score is their harmonic mean, penalising models that sacrifice one for the other. For most real problems with imbalanced classes, F1 or the Matthews Correlation Coefficient are far more informative than raw accuracy.'
          },
          {
            heading: 'The ROC Curve and AUC',
            body: 'The Receiver Operating Characteristic (ROC) curve plots true positive rate against false positive rate at every possible classification threshold, showing the fundamental tradeoff between catching positives and generating false alarms. The Area Under the Curve (AUC-ROC) summarises this tradeoff into a single number: 0.5 is random chance, 1.0 is perfect. AUC is threshold-independent and robust to class imbalance, making it the standard metric for binary classifiers in medicine and fraud detection. The Precision-Recall curve is preferable when the positive class is rare.'
          },
          {
            heading: 'Confusion Matrix Analysis',
            body: 'A confusion matrix shows the full joint distribution of predictions against true labels — every combination of predicted and actual class. For a binary classifier: True Positives, True Negatives, False Positives, and False Negatives. False Positive Rate and False Negative Rate have very different business costs: in cancer screening, missing a positive (FN) is catastrophic; in spam filtering, misclassifying a valid email (FP) is merely annoying. Always reason about the asymmetric cost of errors in your domain when deciding where to set the decision threshold.'
          },
          {
            heading: 'Baselines and Business Metrics',
            body: 'Every model should be compared against a simple baseline: always-predict-majority-class, predict-the-mean, or a business heuristic. If your fancy neural network only beats the baseline by 1%, the complexity cost is almost never worth it. Business metrics — revenue generated, churn prevented, fraud dollars caught — matter more than statistical ones. The gap between validation AUC and business impact is often large. Model calibration, fairness constraints, latency requirements, and cost-of-errors all mediate that gap and must be factored into evaluation from the start.'
          }
        ],
        takeaway: 'Accuracy alone is almost never the right metric — choose evaluation criteria that reflect the asymmetric costs of error types in your specific business context.'
      },
      {
        id: 'overfitting',
        title: 'Overfitting & Regularisation',
        duration: '4 min',
        intro: 'Overfitting is the fundamental tension in machine learning: a model that memorises its training data performs brilliantly on examples it has seen and terribly on new ones. Regularisation is the set of techniques used to prevent this, enabling models to generalise.',
        points: [
          {
            heading: 'The Bias-Variance Tradeoff',
            body: 'Model error decomposes into bias (systematic underfitting — the model is too simple to capture the true pattern) and variance (sensitivity to noise — the model fits the training data\'s idiosyncrasies too closely). Simple models have high bias and low variance. Complex models have low bias and high variance. The goal is to find the sweet spot. Validation curves — plotting training and validation performance against model complexity — visually reveal where a model transitions from underfitting to overfitting, guiding the right complexity level for your dataset size.'
          },
          {
            heading: 'L1 and L2 Regularisation',
            body: 'L2 regularisation (Ridge) adds the sum of squared weights to the loss function, penalising large weights and shrinking all of them toward zero proportionally. L1 regularisation (Lasso) adds the sum of absolute weight values, which drives some weights exactly to zero — performing implicit feature selection. Elastic Net combines both. The regularisation strength hyperparameter (often called lambda or alpha) controls the penalty magnitude. Increasing it combats overfitting but risks underfitting if taken too far. Cross-validation is the standard way to select the right value.'
          },
          {
            heading: 'Dropout and Data Augmentation',
            body: 'Dropout is a regularisation technique for neural networks: during each training batch, each neuron is randomly zeroed out with probability p (typically 0.2–0.5). This forces the network to learn redundant representations and prevents co-adaptation of neurons. Data augmentation artificially expands the training set by applying label-preserving transformations — random crops, flips, colour jitter for images; synonym replacement, back-translation for text. Both techniques effectively increase the diversity of training signal without collecting more real data, and are standard practice in deep learning.'
          },
          {
            heading: 'Early Stopping and Model Complexity',
            body: 'Early stopping monitors validation loss during training and halts when it starts to increase, even if training loss is still decreasing. This is a form of implicit regularisation that prevents the model from spending additional epochs memorising training noise. It requires a validation set and a patience hyperparameter (how many epochs to wait for improvement before stopping). Model complexity — the number of parameters — is itself a regularisation lever: a 10-layer network overfits far more easily than a 3-layer one on the same data. Always start simple and add complexity only when underfitting is confirmed.'
          }
        ],
        takeaway: 'Overfitting is memorisation, not learning — regularisation techniques like L2, dropout, data augmentation, and early stopping force models to generalise to unseen data rather than just replay training examples.'
      },
      {
        id: 'hyperparameters',
        title: 'Hyperparameter Tuning',
        duration: '4 min',
        intro: 'Model parameters are learned from data; hyperparameters are knobs you set before training even starts. Learning rate, batch size, network depth, dropout rate — these shape how the whole training run behaves, and the difference between mediocre and excellent results often comes down to tuning them.',
        points: [
          {
            heading: 'The Knobs That Matter Most',
            body: 'Learning rate is by far the most important: too high and training diverges, too low and it crawls. Batch size affects both training speed and final accuracy. Network depth and width set capacity. Regularisation strength (L2, dropout) controls overfitting. Optimiser choice (SGD, Adam, AdamW) interacts with everything else. The Pareto rule applies — a few hyperparameters drive most of the gain; tune those first.'
          },
          {
            heading: 'Grid Search vs Random Search',
            body: 'Grid search tries every combination of values you specify on each axis. It\'s exhaustive but explodes combinatorially — 5 values across 5 hyperparameters is already 3125 runs. Random search samples combinations randomly within ranges and consistently outperforms grid search at the same compute budget, because most hyperparameters don\'t matter equally and random sampling is more likely to land near the important ones.'
          },
          {
            heading: 'Bayesian and Population-Based Methods',
            body: 'Bayesian optimisation builds a surrogate model of how hyperparameters map to validation loss, then proposes the next configuration most likely to improve. Population-based training runs many trials in parallel, periodically replacing the worst with mutated versions of the best. Both approaches dramatically reduce the number of training runs needed. Tools like Optuna, Ray Tune, and Weights & Biases Sweeps automate this end-to-end.'
          },
          {
            heading: 'Don\'t Tune on the Test Set',
            body: 'A subtle but devastating mistake: every hyperparameter you choose by checking test-set performance leaks information from the test set into your model selection. Always tune on a separate validation set, then evaluate the final winning configuration once on the test set. Otherwise your published accuracy will be optimistic and the model will disappoint in production.'
          }
        ],
        takeaway: 'Hyperparameters control the shape of training itself. Random search and Bayesian methods beat grid search; tune on validation data only; and obsess over learning rate first.'
      },
      {
        id: 'cross-validation',
        title: 'Cross-Validation Done Right',
        duration: '3 min',
        intro: 'A single train/validation split is fast but noisy — the score you get depends on which examples happened to land in validation. Cross-validation gives you a more reliable estimate by training and evaluating multiple times.',
        points: [
          {
            heading: 'k-Fold Cross-Validation',
            body: 'Split the training data into k equal folds (typically 5 or 10). Train k separate models, each holding out one fold for validation and training on the rest. Average the k validation scores. The result is a more stable estimate of how the model generalises, and the variance across folds tells you how sensitive performance is to the specific split. Compute cost scales linearly with k.'
          },
          {
            heading: 'Stratified Folds for Imbalanced Data',
            body: 'If your classes are imbalanced — 95% no-fraud, 5% fraud — random k-fold can produce folds with no fraud examples at all, breaking validation. Stratified k-fold ensures each fold preserves the class ratio of the full dataset. For continuous targets, bin the target into ranges and stratify on those bins. Most ML libraries provide stratified splitters out of the box.'
          },
          {
            heading: 'Time-Series Splits',
            body: 'Standard k-fold is wrong for time-series data because it lets the model train on future examples to predict past ones — leakage. Use expanding-window or rolling-window splits: each fold trains on data up to time t and validates on data from t to t+Δ. The fold scores reflect how the model actually performs in deployment, where you can only train on the past.'
          },
          {
            heading: 'When NOT to Cross-Validate',
            body: 'When you have millions of examples, a single 80/20 split is already low-variance — k-fold buys little but costs k× the compute. When training is expensive (large language models, multi-day runs) the cost is prohibitive. Use cross-validation for small-to-medium datasets and during hyperparameter search; skip it once you have abundant data and a chosen configuration.'
          }
        ],
        takeaway: 'Cross-validation trades compute for confidence. Stratify on imbalance, respect time order on temporal data, and skip it when you have data abundance or compute scarcity.'
      }
    ]
  },

  {
    id: 'ai-app-dev',
    title: 'AI App Development',
    icon: '◉',
    color: 'gold',
    lessons: [
      {
        id: 'choosing-api',
        title: 'Choosing the Right AI API',
        duration: '4 min',
        intro: 'Building AI applications today mostly means choosing and calling the right API, not training models from scratch. The landscape is rich and rapidly evolving — making a deliberate, informed choice upfront saves painful migration work later.',
        points: [
          {
            heading: 'Frontier vs Open-Weight Models',
            body: 'Frontier models (Claude, GPT-4, Gemini) are closed, accessed via API, and regularly updated. They deliver the best out-of-the-box capability with no infrastructure burden, but you pay per token and have no control over model changes or data privacy guarantees. Open-weight models (Llama, Mistral, Qwen) can be self-hosted, customised with fine-tuning, and run entirely on-premises. The right choice depends on your latency requirements, data sensitivity, budget, and whether your use case needs fine-tuning to meet quality bars.'
          },
          {
            heading: 'Cost Modelling: Input vs Output Tokens',
            body: 'API pricing is usually split between input tokens (your prompt) and output tokens (the model\'s response), with output typically 3–5× more expensive. A RAG application that sends 2,000-token context windows with every query can quickly accumulate costs. Estimate: (daily_queries × avg_prompt_tokens × input_price) + (daily_queries × avg_output_tokens × output_price). Prompt caching, available on Anthropic and OpenAI, reduces cost for repeated long contexts by up to 90% — essential for production systems with static system prompts or reused reference documents.'
          },
          {
            heading: 'Context Window and Task Requirements',
            body: 'Context window size (the maximum tokens a model can process in one call) determines what tasks are possible. Summarising a 200-page contract requires a 200K+ token window. Conversational assistants need enough context to hold a multi-turn dialogue. Coding assistants need to see entire files. Embedding models (used for semantic search and RAG) operate differently — they transform text into dense vectors and have their own context limits. Match the model\'s context limit to your task\'s information requirements, not just to the largest window available.'
          },
          {
            heading: 'Evaluating Quality for Your Use Case',
            body: 'Benchmarks like MMLU and HumanEval give global quality scores but rarely predict performance on your specific task. Build an evaluation set of 50–200 examples representative of your production inputs, with gold-standard expected outputs or human rater rubrics. Run each candidate model through this eval set and score with LLM-as-judge, human raters, or automatic metrics appropriate to the task. This task-specific eval set becomes your most valuable asset — it lets you compare models, detect regressions after API updates, and justify model choice to stakeholders.'
          }
        ],
        takeaway: 'The best AI API for your app depends on cost, context size, data privacy needs, and task-specific quality — build a small eval set before committing to any provider.'
      },
      {
        id: 'prompt-engineering',
        title: 'Prompt Engineering Fundamentals',
        duration: '5 min',
        intro: 'Prompt engineering is the practice of crafting inputs to language models that reliably produce the outputs you want. It is part science, part communication design — the most impactful leverage point for improving model behaviour without any fine-tuning.',
        points: [
          {
            heading: 'System Prompts and Role Assignment',
            body: 'The system prompt sets the model\'s persona, capabilities, constraints, and behavioural guidelines for the entire conversation. Effective system prompts are specific about tone ("respond in plain English, avoid jargon"), scope ("only answer questions about our product documentation"), format ("always return valid JSON"), and refusal behaviour. Assigning a concrete role — "You are a senior tax attorney" vs "You are a helpful assistant" — dramatically shifts the default register, depth, and terminology of responses. System prompt design is the primary interface between product requirements and model behaviour.'
          },
          {
            heading: 'Few-Shot Prompting',
            body: 'Few-shot prompting provides examples of desired input-output pairs directly in the prompt, before the target input. Three to five carefully chosen, diverse examples dramatically improve output consistency — especially for structured extraction, format adherence, and tasks with nuanced classification criteria. Example quality matters more than quantity: one clear, representative example outperforms five ambiguous ones. For classification tasks, ensure examples cover all classes; for generation tasks, demonstrate the exact output format including edge cases like empty results or error states.'
          },
          {
            heading: 'Chain-of-Thought (CoT) Reasoning',
            body: 'For complex reasoning tasks, instructing the model to think step-by-step before giving a final answer improves accuracy substantially — sometimes by 30% or more on multi-step arithmetic and logical reasoning benchmarks. Append "Let\'s think step by step" or "Work through this reasoning before answering" to activate CoT. Extended Thinking (available in Claude 3.7+) moves CoT reasoning into a separate, observable scratchpad. Zero-shot CoT often matches few-shot CoT performance at no example cost. For production, consider whether showing reasoning adds value to users or should be hidden behind a final polished response.'
          },
          {
            heading: 'Structured Output and Schema Enforcement',
            body: 'Unstructured free text is hard to parse programmatically. Constrain outputs to JSON or a defined schema by: (1) specifying the schema explicitly in the system prompt, (2) providing a filled-in example via few-shot, and (3) using the API\'s structured output feature (available on OpenAI and via tool use on Anthropic) to force schema compliance. Always validate outputs with a schema parser — even well-prompted models occasionally deviate on edge inputs. TypeScript/Zod or Pydantic validation at the API boundary protects your downstream system from malformed data.'
          }
        ],
        takeaway: 'Prompt engineering is the fastest iteration loop in AI development — system prompts define behaviour, few-shot examples demonstrate it, chain-of-thought unlocks reasoning, and structured outputs make responses programmable.'
      },
      {
        id: 'rag',
        title: 'RAG: Retrieval-Augmented Generation',
        duration: '5 min',
        intro: 'Retrieval-Augmented Generation (RAG) solves one of the biggest limitations of language models: their knowledge is frozen at training time. By connecting a model to a live knowledge base at query time, RAG makes AI applications accurate, up-to-date, and grounded in specific source documents.',
        points: [
          {
            heading: 'The Core RAG Pipeline',
            body: 'RAG has two phases. Offline: chunk your documents into 200–500 token segments, embed each chunk with an embedding model to produce a dense vector, and store chunks with their vectors in a vector database (Pinecone, Qdrant, Chroma). Online: embed the user\'s query using the same embedding model, search the vector database for the top-K most similar chunks (by cosine similarity), inject those chunks into the model\'s context window as background knowledge, then generate a response grounded in those retrieved passages. The model should cite its sources — enabling humans to verify its claims.'
          },
          {
            heading: 'Chunking Strategies',
            body: 'How you split documents profoundly affects retrieval quality. Fixed-size chunking (split every 500 tokens) is simple but often cuts mid-sentence or separates a question from its answer. Semantic chunking splits at natural boundaries — paragraphs, section headings, or semantically distinct passages detected by an embedding similarity drop. Hierarchical chunking stores both fine-grained chunks and their parent sections, retrieving detailed chunks but passing the parent for context. Small chunks retrieve with higher precision; large chunks carry more context per retrieval. Experimenting with chunk size is one of the highest-ROI optimisations in a RAG system.'
          },
          {
            heading: 'Hybrid Search: Dense + Sparse Retrieval',
            body: 'Dense retrieval (vector similarity) excels at semantic matching — finding documents about the same concept even if phrased differently. Sparse retrieval (BM25, keyword search) excels at exact-match queries — finding documents containing a specific product code, name, or technical term. Hybrid search combines both: dense retrieval catches paraphrase; sparse retrieval catches exact identifiers. Reciprocal Rank Fusion (RRF) is a simple, effective way to merge results from both retrievers by re-ranking based on position in each ranked list. Most production RAG systems use hybrid search.'
          },
          {
            heading: 'Evaluating and Improving RAG',
            body: 'RAG evaluation decomposes into retrieval quality and generation quality. Retrieval: are the right chunks being fetched? Measure recall@K — the fraction of queries where the correct chunk appears in the top K results. Generation: is the model faithfully using retrieved context? RAGAS is an open-source framework providing metrics for faithfulness (does the answer follow from context?), answer relevancy, and context precision/recall. Common failure modes: retrieval returning irrelevant chunks (fix with better chunking or re-ranking), and the model ignoring retrieved context to answer from its weights instead (fix with explicit grounding instructions).'
          }
        ],
        takeaway: 'RAG makes AI systems accurate and citable by retrieving relevant context at query time — retrieval quality is the bottleneck, so investing in chunking strategy and hybrid search yields the largest quality gains.'
      },
      {
        id: 'ai-agents',
        title: 'AI Agents & Tool Use',
        duration: '5 min',
        intro: 'AI agents use language models not just to answer questions but to take actions — calling APIs, searching the web, writing and executing code, and orchestrating multi-step workflows. They are the architecture behind the most powerful AI applications being built today.',
        points: [
          {
            heading: 'The ReAct Pattern (Reason + Act)',
            body: 'ReAct interleaves reasoning and action: the model produces a thought explaining what it needs to do, then takes an action (calling a tool), observes the result, and repeats until it can produce a final answer. This observation-thought-action loop enables solving problems that require multiple steps of information gathering and reasoning. The loop is implemented by parsing the model\'s output for action specifications, executing the tool, and appending the result to the conversation before prompting for the next step. Prompt engineering is critical — the model must reliably distinguish between thoughts and actionable tool calls.'
          },
          {
            heading: 'Tool Definitions and Function Calling',
            body: 'Tools are defined as JSON schemas describing the function name, description, and parameters. The description is critical — the model decides which tool to call based entirely on the description, so it must be precise and distinct from other tools. Parameters need type annotations and descriptions, including valid ranges and example values. Anthropic\'s tool use API and OpenAI\'s function calling both support native structured tool invocations that are more reliable than parsing free text for function calls. Always return structured tool results — the model uses them as inputs for its next reasoning step.'
          },
          {
            heading: 'Memory Architecture for Agents',
            body: 'Agents need multiple types of memory to function effectively. In-context memory is the conversation history within the active context window — limited but immediately accessible. External memory (a database or vector store) persists information across sessions and scales beyond context limits. Episodic memory logs past agent runs for debugging and learning. Semantic memory stores distilled knowledge extracted from interactions. For long-running agents, a memory manager that selects which past information to include in context — prioritising recency, relevance, and importance — is often the most impactful engineering investment.'
          },
          {
            heading: 'Safety, Reliability, and Guardrails',
            body: 'Autonomous agents that take real actions (sending emails, executing code, calling financial APIs) require robust guardrails. Confirmation checkpoints make the agent pause for human approval before irreversible actions. Maximum step limits prevent runaway loops. Sandboxed code execution isolates agent-written code from the host system. Output validation ensures tool call arguments are within expected bounds. Prompt injection — where malicious text in retrieved content hijacks the agent\'s instructions — is a serious production risk requiring input sanitisation and separation between content and instructions. Start agents in read-only mode and expand privileges incrementally.'
          }
        ],
        takeaway: 'Agents extend language models from answering questions to taking actions — the ReAct loop, clear tool definitions, memory architecture, and strict safety guardrails are the four pillars of reliable agent design.'
      },
      {
        id: 'testing-ai-apps',
        title: 'Testing & Evaluating AI Apps',
        duration: '4 min',
        intro: 'AI applications cannot be fully tested with traditional unit tests because their outputs are probabilistic and open-ended. Building a rigorous evaluation system is the difference between an AI feature that ships with confidence and one that causes embarrassing production failures.',
        points: [
          {
            heading: 'Eval Sets and Golden Datasets',
            body: 'Your primary testing asset is a curated eval set of 50–500 representative test cases with expected outputs or grading criteria. Build it incrementally: start with handcrafted examples covering your key use cases, then add examples from production failures as they occur. Golden datasets — a stable, versioned set of cases — let you measure whether changes to prompts, models, or retrieval improve or regress overall performance. Treat your eval set with the same rigour as your production code: version it in git, review additions carefully, and never shrink it.'
          },
          {
            heading: 'LLM-as-Judge Evaluation',
            body: 'Human evaluation is the gold standard but is slow and expensive to run frequently. LLM-as-judge uses a capable model (Claude or GPT-4) to score outputs on a rubric: accuracy, helpfulness, tone, citation correctness. Write explicit scoring rubrics (1–5 scales with anchored descriptions for each level) rather than asking for a vague "quality" score. Validate judge scores against a sample of human ratings to detect systematic bias. The judge model should be as capable as or better than the model being evaluated — a weak judge cannot reliably assess a strong model.'
          },
          {
            heading: 'Regression Testing on Model Updates',
            body: 'API providers update their models frequently — sometimes without notice, sometimes with announced deprecations. A new model version that improves average performance may regress on specific capabilities your app depends on. Set up automated evaluation runs that execute your full eval set on every deployment and flag regressions. A/B test prompt changes before full rollout by routing a fraction of live traffic to the new prompt and comparing metrics. Track eval set pass rates over time with a dashboard — it is your equivalent of a test coverage report for AI behaviour.'
          },
          {
            heading: 'Adversarial Testing and Red Teaming',
            body: 'Normal eval sets tell you how the app behaves under typical inputs. Red teaming tells you how it behaves under adversarial ones — prompt injection attempts, jailbreak requests, edge-case inputs that break your parsing logic, and queries designed to expose bias or factual gaps. Structured red teaming sessions (designate team members to attack the system for an hour) surface issues that normal QA misses. Tools like Garak and PromptBench automate adversarial probe generation. For consumer-facing applications, adversarial testing is not optional — it is a product safety requirement.'
          }
        ],
        takeaway: 'AI app quality is maintained through curated eval sets, LLM-as-judge automation, regression tracking, and adversarial red teaming — not traditional unit tests alone.'
      },
      {
        id: 'embeddings-vector-db',
        title: 'Embeddings & Vector Databases',
        duration: '4 min',
        intro: 'Embeddings turn text, images, or any other data into dense numerical vectors that capture meaning. Vector databases let you search those vectors at scale. Together they\'re the foundation of semantic search, recommendation systems, and Retrieval-Augmented Generation.',
        points: [
          {
            heading: 'What an Embedding Actually Is',
            body: 'An embedding is a list of numbers — typically 384 to 3072 dimensions — produced by a neural network from input data. The geometry of these vectors encodes meaning: documents with similar topics cluster close together; words with similar usage patterns end up near each other. The same model produces consistent embeddings, which lets you measure similarity by computing cosine distance or dot product between two vectors.'
          },
          {
            heading: 'Why Vector Search Beats Keyword Search',
            body: 'Keyword search matches strings literally — it misses synonyms, paraphrases, and conceptual matches. A query for "fix engine noise" misses a document titled "diagnose strange motor sounds." Vector search compares meaning, so semantically related content surfaces even when the words are completely different. This is what makes modern AI search feel intelligent rather than dumb-string-matching.'
          },
          {
            heading: 'Vector Databases at Scale',
            body: 'Computing distances against millions of vectors naively is slow. Vector databases — Pinecone, Weaviate, Qdrant, pgvector, Milvus — use approximate nearest neighbour algorithms (HNSW, IVF) that trade a tiny accuracy loss for orders-of-magnitude speedup. They also handle metadata filtering (search only documents from this user, tagged with these labels), hybrid search (combine keyword and vector scores), and incremental updates.'
          },
          {
            heading: 'The RAG Pattern',
            body: 'Retrieval-Augmented Generation is the killer use case: chunk your documents, embed each chunk, store them in a vector DB. At query time, embed the user\'s question, retrieve the top-k most similar chunks, and inject them into the LLM prompt as context. The result is an LLM that answers questions about your private data without retraining — and cites its sources. RAG is the workhorse pattern behind most "chat with your docs" products today.'
          }
        ],
        takeaway: 'Embeddings turn meaning into geometry; vector databases search that geometry at scale. Together they unlock semantic search and the RAG pattern that lets LLMs work with your private data.'
      },
      {
        id: 'ai-cost-latency',
        title: 'AI Cost & Latency Optimisation',
        duration: '4 min',
        intro: 'A great AI app that\'s slow or expensive is a great AI app that nobody can ship. Cost and latency are first-class product concerns — and there are concrete techniques to dramatically improve both without sacrificing quality.',
        points: [
          {
            heading: 'Pick the Right Model for Each Step',
            body: 'Don\'t use the biggest model for everything. A pipeline might use a tiny model to classify intent, a medium model to extract structure, and only call the largest model when truly creative output is needed. Anthropic\'s Haiku, OpenAI\'s gpt-4o-mini, and Google\'s Gemini Flash are 10–100× cheaper and faster than their flagship siblings — and good enough for most steps.'
          },
          {
            heading: 'Prompt Caching',
            body: 'Most production prompts have huge static prefixes — system instructions, schemas, examples. Anthropic, OpenAI, and Google all support prompt caching: the static prefix is processed once and reused across calls at a fraction of the input-token cost. This often cuts LLM bills by 50–90% with one config change. Place all volatile content (the user\'s question) at the end of the prompt.'
          },
          {
            heading: 'Streaming for Perceived Speed',
            body: 'A 3-second full response feels slower than a 5-second response that starts streaming the first words at 300ms. Streaming via Server-Sent Events lets users start reading immediately and gives them an out — they can stop reading as soon as they have what they need. Almost every modern LLM API supports streaming; almost every great LLM product uses it.'
          },
          {
            heading: 'Batch and Cache When Possible',
            body: 'For non-interactive workloads — generating product descriptions, classifying support tickets, summarising documents — use the batch API. Anthropic and OpenAI both offer 50% off on batch requests with a 24-hour SLA. For repeated identical queries, cache results in Redis or your DB. A simple hash-of-prompt cache can eliminate 30%+ of LLM calls in user-facing products with predictable patterns.'
          }
        ],
        takeaway: 'AI cost and latency are levers, not constants. Use small models where you can, cache static prompt prefixes, stream tokens for perceived speed, and batch non-interactive work.'
      }
    ]
  },

  {
    id: 'deployment-ethics',
    title: 'Deployment & Ethics',
    icon: '✦',
    color: 'red',
    lessons: [
      {
        id: 'deploying-models',
        title: 'Deploying AI Models to Production',
        duration: '4 min',
        intro: 'Getting an AI model working in a notebook and getting it serving millions of users reliably are two very different engineering challenges. Production deployment requires thinking about latency, cost, reliability, and the lifecycle of a model over months and years.',
        points: [
          {
            heading: 'Serving Infrastructure Options',
            body: 'For API-backed models, deployment is as simple as an environment variable and an API client — the provider handles infrastructure. For self-hosted open-weight models, you need GPU-enabled inference infrastructure. vLLM and TensorRT-LLM are high-performance serving frameworks that implement continuous batching (processing multiple requests simultaneously) and PagedAttention (efficient KV-cache management) to maximise throughput. Cloud options (AWS Bedrock, Azure AI, Google Vertex AI) provide managed endpoints for both frontier and open-weight models, trading flexibility for operational simplicity.'
          },
          {
            heading: 'Latency Optimisation Techniques',
            body: 'Latency is a critical user-experience factor — users abandon AI features that respond in more than 3–5 seconds. Streaming tokens to the UI via Server-Sent Events makes responses feel faster even if total time is unchanged. Caching frequent or identical queries with Redis eliminates redundant API calls. Speculative decoding generates multiple candidate tokens in parallel, accepting the most likely ones. Quantisation reduces model precision (from float32 to int8 or int4) with minimal quality loss, cutting memory requirements in half and doubling throughput. Profile before optimising: identify the actual bottleneck (network, model inference, post-processing) first.'
          },
          {
            heading: 'Containerisation and Scaling',
            body: 'Package your AI application in a Docker container with all dependencies pinned to specific versions — this eliminates "works on my machine" problems and enables reproducible deployments. Kubernetes orchestrates containers at scale, automatically spinning up new instances under load and replacing failed ones. Horizontal scaling (more instances) handles request volume; vertical scaling (larger GPUs) handles larger models or batch sizes. For most AI API applications, standard web scaling applies — the model is just a remote service call. For self-hosted models, GPU autoscaling with scale-to-zero is often cost-optimal for variable traffic.'
          },
          {
            heading: 'CI/CD for AI Applications',
            body: 'Continuous Integration/Continuous Deployment pipelines for AI applications run eval sets on every pull request, blocking deployment if performance drops below threshold. Include: (1) unit tests for data preprocessing and output parsing, (2) integration tests against a development model endpoint, (3) regression tests against your golden eval set, (4) performance benchmarks measuring latency and cost. Treat model version, system prompt, and retrieval configuration as versioned artifacts in git alongside code. Rolling deployments and feature flags enable gradual rollout of changes with the ability to instantly roll back if evaluation metrics degrade in production.'
          }
        ],
        takeaway: 'Production AI deployment is a systems engineering problem — latency, cost, reliability, and automated quality gates require the same rigour as any other production service.'
      },
      {
        id: 'monitoring-ai',
        title: 'Monitoring AI Systems',
        duration: '4 min',
        intro: 'AI systems degrade silently. Unlike a server crash that produces an obvious error, a model that has drifted or is being misused may continue to return 200 OK responses while quietly delivering wrong, harmful, or biased outputs. Monitoring is your early warning system.',
        points: [
          {
            heading: 'Logging Inputs, Outputs, and Metadata',
            body: 'Every production AI call should be logged: the input prompt (or a hash for privacy), the output, token counts, latency, model version, and relevant user context. This creates an audit trail for debugging, a source of data for improving your eval set, and evidence for compliance. Log sampling (storing 5% of requests in full detail, rest as metadata) balances storage cost against completeness. Structured logs (JSON) enable downstream analysis. Ensure your logging pipeline is asynchronous — blocking the request-response cycle to write logs adds unacceptable latency.'
          },
          {
            heading: 'Data Drift and Concept Drift Detection',
            body: 'Data drift occurs when the distribution of inputs changes over time — users start asking questions your system was never tested on. Concept drift occurs when the relationship between inputs and correct outputs changes — the world changes but the model does not update. Monitor input distributions using statistical tests (Population Stability Index, Jensen-Shannon divergence between training and serving distributions). Track output distributions — a sudden spike in refusals or a shift in sentiment scores signals something has changed. Set up alerts for distribution shifts before they degrade user experience.'
          },
          {
            heading: 'Quality Metrics in Production',
            body: 'Aggregate metrics from your eval set capture average quality but miss per-query failures. Implement user satisfaction signals: thumbs up/down, session abandonment rates, rephrasing frequency (a user who immediately rephrases suggests the first response was wrong). Online evaluation — routing a fraction of production traffic through LLM-as-judge scoring — provides continuous quality estimates without human raters. Set SLOs (Service Level Objectives) for quality metrics, not just uptime: "95% of responses score ≥3/5 on helpfulness" is a meaningful commitment to track against.'
          },
          {
            heading: 'Safety Monitoring and Content Moderation',
            body: 'For customer-facing applications, safety monitoring detects policy violations in inputs and outputs. Lightweight classifier-based guardrails (using models like LlamaGuard or providers\' moderation APIs) screen for harmful content categories in real time with minimal added latency. Anomaly detection flags unusual patterns — a single user sending hundreds of similar requests may indicate automated probing or a jailbreak campaign. Rate limiting, account-level monitoring, and human review queues for flagged content form a layered defence. Safety monitoring data also feeds back into red teaming efforts to strengthen defences.'
          }
        ],
        takeaway: 'AI monitoring tracks the silent ways systems degrade — drift in inputs, drift in quality, and safety violations all require active measurement because they produce no obvious errors.'
      },
      {
        id: 'ai-safety',
        title: 'AI Safety & Alignment',
        duration: '5 min',
        intro: 'AI safety is the field dedicated to ensuring AI systems behave as intended, remain under meaningful human control, and do not cause unintended harm as they become more capable. It is both a near-term engineering discipline and a long-term research challenge.',
        points: [
          {
            heading: 'The Specification Problem',
            body: 'Specifying exactly what you want an AI to do is surprisingly hard. A simple objective like "maximise user engagement" leads a recommendation system to promote outrage. "Minimise customer wait time" leads a routing algorithm to hang up on difficult calls. This pattern — Goodhart\'s Law in action — occurs because measurable proxies diverge from true goals when maximised. Reward hacking (finding loopholes in the specified objective) emerges in RL systems: a boat racing agent discovered it could score more points by going in circles collecting power-ups than by actually winning the race.'
          },
          {
            heading: 'RLHF and Constitutional AI',
            body: 'Reinforcement Learning from Human Feedback (RLHF) trains a reward model on human preference data, then uses RL to optimise the language model against that reward model. This is how ChatGPT and Claude became conversationally helpful and safe. Constitutional AI (Anthropic\'s method) uses a set of principles and a critique-revision loop — asking the model to identify and correct its own violations — to reduce reliance on human labels for harmlessness training. Both methods improve alignment but are imperfect: the reward model can be gamed, and principles can conflict in edge cases.'
          },
          {
            heading: 'Robustness and Adversarial Inputs',
            body: 'Aligned models can be made to behave badly through adversarial prompting. Jailbreaks use creative framing (roleplay scenarios, hypothetical framings, base64 encoding) to bypass safety training. Prompt injection embeds malicious instructions in data the model reads (a webpage, a document) to hijack its behaviour mid-task. Multi-turn attacks gradually shift the model\'s context toward a policy violation. Defences include input filtering, sandboxed execution environments, instruction hierarchy (marking system prompts as trusted and user inputs as untrusted), and monitoring for known attack patterns. No defence is complete; defence in depth is the principle.'
          },
          {
            heading: 'Scalable Oversight and Control',
            body: 'As AI systems become more capable and tackle more complex tasks, human oversight becomes harder. A human can easily verify whether an email is polite; verifying whether a complex legal strategy is correct is much harder. Scalable oversight techniques (debate, recursive reward modelling, AI-assisted critique) try to maintain human control even when humans cannot directly evaluate model outputs. Minimal footprint principles — agents that request only necessary permissions, prefer reversible actions, and check in when uncertain — keep humans in the loop by design. Building for control today builds the muscle needed as capabilities increase.'
          }
        ],
        takeaway: 'AI safety is an engineering discipline as much as a philosophical one — specification, RLHF, adversarial robustness, and scalable oversight are concrete techniques for keeping AI systems aligned with human intent.'
      },
      {
        id: 'responsible-ai',
        title: 'Responsible AI Practices',
        duration: '5 min',
        intro: 'Responsible AI is the organisational and technical practice of building AI systems that are fair, accountable, transparent, and beneficial. It is not just ethics in the abstract — it is a set of concrete processes that reduce harm and build trust.',
        points: [
          {
            heading: 'AI Impact Assessments',
            body: 'Before deploying a consequential AI system, conduct an impact assessment: who is affected by its decisions? What are the risks if it fails or behaves incorrectly? Who are the stakeholders who should be consulted? The EU AI Act mandates formal risk assessments for high-risk AI systems (hiring, credit, healthcare, law enforcement). Even outside regulatory requirements, a structured impact assessment forces you to surface risks that are invisible when development teams focus exclusively on capability. Publish the assessment internally and update it as the system evolves.'
          },
          {
            heading: 'Algorithmic Fairness and Equity',
            body: 'Fairness is not a single property — it is a family of related but sometimes contradictory metrics. Demographic parity requires equal positive prediction rates across groups. Equalised odds requires equal true and false positive rates. Individual fairness requires similar individuals to receive similar outcomes. These definitions are mathematically incompatible in many realistic settings. Choosing which fairness criterion to optimise is a value judgement that must involve affected communities, not just data scientists. Document your fairness choices explicitly — regulators and auditors will ask why you chose one definition over another.'
          },
          {
            heading: 'Model Cards and Transparency',
            body: 'A model card is a short document that describes what a model does, what data it was trained on, how it was evaluated, its performance across demographic subgroups, intended use cases, and known limitations. First proposed by Google, model cards are now expected by major platforms and increasingly required by regulation. Transparency about limitations builds trust: users who know a model performs worse on non-standard accents will calibrate their trust appropriately rather than being blindsided by failures. Write model cards before deployment, not as an afterthought.'
          },
          {
            heading: 'Human-in-the-Loop Design',
            body: 'Not all AI decisions should be fully automated. High-stakes, irreversible, or novel decisions benefit from human review. Design explicit escalation paths: decisions above a confidence threshold proceed automatically; those below go to a human queue. Ensure humans in the loop are not just rubber-stamping — cognitive automation bias causes humans to approve AI decisions without critical examination when presented as a default. Counterfactual explanations ("this loan was denied; changing income to X would result in approval") give reviewers actionable information rather than opaque confidence scores.'
          }
        ],
        takeaway: 'Responsible AI is operationalised through impact assessments, documented fairness choices, transparent model cards, and intentional human-in-the-loop design for high-stakes decisions.'
      },
      {
        id: 'future-of-ai',
        title: 'The Future of AI',
        duration: '4 min',
        intro: 'AI is progressing faster than almost any technology in history. Understanding the trajectories — what is likely, what is speculative, and what you can do to stay ahead — is the final lesson for any AI practitioner.',
        points: [
          {
            heading: 'Scaling Laws and Their Limits',
            body: 'The empirical observation that model performance improves predictably as a power law with compute, data, and parameter count — Chinchilla scaling laws — has driven the push for ever-larger models. But returns are diminishing and the cost is enormous. The frontier is shifting toward inference-time compute scaling: giving models more compute to think at query time (chain-of-thought, tree-search) rather than just training larger models. OpenAI\'s o1/o3 and Anthropic\'s extended thinking demonstrate that trading inference FLOPs for reasoning quality is a viable complementary axis of scaling.'
          },
          {
            heading: 'Multimodal and Embodied AI',
            body: 'Current frontier models process text, images, audio, and video in a unified architecture. The next wave extends to physical interaction: robotics systems that understand natural language instructions, perceive environments through cameras and sensors, and manipulate the physical world. Models like Google DeepMind\'s RT-2 demonstrate that vision-language pre-training directly improves robot generalisation. Embodied AI closes the loop between perception, reasoning, and action that current language models lack — and may require fundamentally different training paradigms than web-scale text prediction.'
          },
          {
            heading: 'The Commoditisation of Intelligence',
            body: 'As capable AI becomes widely available via APIs, intelligence itself becomes a commodity. Competitive advantage shifts to: proprietary data (unique training datasets), distribution (embedding AI into existing workflows users already have), customer relationships (trust and adoption), and speed of iteration. The companies and individuals who win will not be those who control the smartest model but those who most effectively apply intelligence to specific, high-value problems. For builders, this means deep domain expertise combined with AI proficiency is more valuable than AI proficiency alone.'
          },
          {
            heading: 'Preparing for Continued Rapid Change',
            body: 'The half-life of specific AI knowledge is short — frameworks and models that lead today may be obsolete in 18 months. Durable skills: building eval systems, designing data pipelines, writing clear technical specifications, and reasoning about system behaviour. Durable habits: reading primary research (arXiv preprints, lab blogs), building small experiments to test new capabilities yourself rather than relying on hype, and maintaining a personal AI application portfolio that demonstrates real value delivery. The practitioners who stay ahead are those who build and ship regularly, not those who wait for the technology to stabilise.'
          }
        ],
        takeaway: 'AI\'s future belongs to practitioners who combine domain expertise with AI fluency — staying current requires building regularly, reading primary research, and focusing on durable skills over specific tools.'
      },
      {
        id: 'ai-ab-testing',
        title: 'A/B Testing AI Features',
        duration: '4 min',
        intro: 'Shipping an AI feature without measurement is shipping in the dark. A/B testing lets you prove an AI change improves the actual outcome you care about — not a benchmark, not a vibe, but real user behaviour.',
        points: [
          {
            heading: 'Pick a North-Star Metric',
            body: 'Don\'t test for "the model is smarter" — test for the business outcome. Conversion rate, completed sessions, time to answer, retained users, support tickets resolved. Define one primary metric and 2-3 guardrails (latency, error rate, cost per call). The primary metric tells you whether the change wins; guardrails tell you whether it wins at acceptable cost.'
          },
          {
            heading: 'Randomise at the Right Level',
            body: 'Randomise users, not requests. If the same user hits both variants in one session, learning effects and inconsistencies confound the test. Use deterministic hashing of the user ID into a bucket so a user always sees the same variant. For features without users (background pipelines), randomise per-document or per-task and analyse with cluster-robust standard errors.'
          },
          {
            heading: 'Power and Sample Size',
            body: 'You need enough users in each variant to detect the effect size you care about. The smaller the expected lift, the more samples needed — detecting a 1% lift may require 50× the sample of a 10% lift. Calculate power before launching: undersampled tests produce false-negatives (real wins look flat) or false-positives (random noise looks like a win). Sequential testing methods like CUPED reduce required sample sizes substantially.'
          },
          {
            heading: 'Beware Novelty and Survivorship',
            body: 'A new AI feature often wins early simply because it\'s new — users explore it. Run tests long enough for novelty to fade (usually 2+ weeks). Watch for survivorship bias too: if users who hate the new feature churn before metrics are collected, your funnel metrics look great but retention craters. Always pair conversion metrics with retention and complaint signals.'
          }
        ],
        takeaway: 'A/B test AI features against real user outcomes, randomise on stable identifiers, calculate power before launching, and watch novelty + survivorship effects so a winning test isn\'t a Pyrrhic one.'
      },
      {
        id: 'ai-red-teaming',
        title: 'Red Teaming AI Systems',
        duration: '4 min',
        intro: 'Red teaming is the practice of attacking your own AI to find failures before adversaries do. It\'s a core part of safe, robust deployment — and now an explicit requirement under several emerging AI regulations.',
        points: [
          {
            heading: 'What Red Teamers Look For',
            body: 'Common categories: prompt injection (malicious input that hijacks instructions), jailbreaks (bypassing safety policies), data leakage (extracting training-data PII), hallucinations on consequential queries, biased or harmful outputs across demographic groups, and tool-use abuse (an agent making unintended API calls). A good red team explores all categories systematically, not just whatever\'s trending.'
          },
          {
            heading: 'Manual vs Automated Red Teaming',
            body: 'Skilled humans find creative attacks no test suite anticipates — social-engineering phrasings, multi-turn jailbreaks, edge cases unique to your domain. Automated red teaming uses one model to generate adversarial prompts against another, scaling coverage to thousands of variants. Use both: humans set the strategy and find novel attack classes, automation expands coverage and runs continuously in CI.'
          },
          {
            heading: 'From Findings to Mitigations',
            body: 'Each successful attack should produce concrete defences: input filtering, output validation, system-prompt hardening, output classifier checks, rate limiting, or model-level fine-tuning. Track every finding in a register with severity, status, and a regression test that runs on every release so the same vulnerability never re-emerges. The register itself becomes evidence in compliance audits.'
          },
          {
            heading: 'Governance and Accountability',
            body: 'Red teaming isn\'t just an engineering task — it\'s a governance one. Decide who has authority to ship despite open red-team findings, what risk threshold blocks release, and how findings are disclosed (to users, regulators, the public). The EU AI Act and the US Executive Order on AI both name red teaming as part of "safe and trustworthy" deployment. Build the muscle now; it\'s only going to be more required, not less.'
          }
        ],
        takeaway: 'Red teaming hunts for failures before users or attackers do. Combine human creativity with automated coverage, convert every finding into a regression test, and treat the practice as core governance — not optional QA.'
      }
    ]
  }
];

/* ──────────────────────────────────────────────────────────────
   PROGRESS TRACKING
────────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'aiChallenge_lessonProgress';

function getProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function markDone(topicId, lessonId) {
  const progress = getProgress();
  const wasAlreadyDone = !!progress[`${topicId}/${lessonId}`];
  progress[`${topicId}/${lessonId}`] = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    // Track for daily goals
    const d   = new Date();
    const str = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    localStorage.setItem('aiChallenge_lastLessonDone', str);
  } catch (e) {
    console.warn('Could not save progress:', e);
  }

  if (!wasAlreadyDone) {
    // Check for topic completion
    const topic = CURRICULUM.find(t => t.id === topicId);
    if (topic) {
      const nowDone = topicDoneCount(topic);
      const total   = topic.lessons.length;
      if (nowDone === total) {
        // All lessons in this topic completed
        const allTotal = totalDoneCount();
        const allMax   = CURRICULUM.reduce((s, t) => s + t.lessons.length, 0);
        if (allTotal === allMax) {
          setTimeout(() => showLessonCelebration('all', topic.title), 480);
        } else {
          setTimeout(() => showLessonCelebration('topic', topic.title), 480);
        }
      }
    }
  }
}

// ── Lesson completion celebration ──────────────────────────────
function showLessonCelebration(type, topicTitle) {
  const existing = document.querySelector('.lesson-cel-toast');
  if (existing) existing.remove();

  const isAll = type === 'all';
  const toast = document.createElement('div');
  toast.className = 'lesson-cel-toast' + (isAll ? ' lesson-cel-all' : '');

  toast.innerHTML = isAll
    ? `<span class="lesson-cel-icon">🎓</span>
       <div class="lesson-cel-body">
         <div class="lesson-cel-title">All 35 Lessons Done!</div>
         <div class="lesson-cel-sub">You've completed the full AI curriculum!</div>
       </div>`
    : `<span class="lesson-cel-icon">🏆</span>
       <div class="lesson-cel-body">
         <div class="lesson-cel-title">Topic Complete!</div>
         <div class="lesson-cel-sub">${topicTitle} finished — well done!</div>
       </div>`;

  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('lesson-cel-visible'));

  const timer = setTimeout(() => dismissLessonToast(toast), 4500);
  toast.addEventListener('click', () => { clearTimeout(timer); dismissLessonToast(toast); });

  // Confetti for big milestones
  if (isAll) lessonConfetti();
}

function dismissLessonToast(toast) {
  toast.classList.remove('lesson-cel-visible');
  setTimeout(() => toast.remove(), 380);
}

function lessonConfetti() {
  const colors = [
    'hsl(270 90% 70%)', 'hsl(200 100% 60%)', 'hsl(142 68% 50%)',
    'hsl(40 95% 58%)',  'hsl(0 82% 62%)',     '#ffffff'
  ];
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const particles = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: -10 - Math.random() * 40,
    vx: (Math.random() - 0.5) * 4,
    vy: 2 + Math.random() * 4,
    r: 5 + Math.random() * 5,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.2
  }));

  let frame = 0;
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.12;
      p.rot += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - frame / 100);
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.5);
      ctx.restore();
    });
    frame++;
    if (frame < 120) requestAnimationFrame(tick);
    else canvas.remove();
  }
  tick();
}

function isDone(topicId, lessonId) {
  return !!getProgress()[`${topicId}/${lessonId}`];
}

function topicDoneCount(topic) {
  const progress = getProgress();
  return topic.lessons.filter(l => progress[`${topic.id}/${l.id}`]).length;
}

function totalDoneCount() {
  const progress = getProgress();
  return CURRICULUM.reduce((sum, topic) =>
    sum + topic.lessons.filter(l => progress[`${topic.id}/${l.id}`]).length, 0
  );
}

/* ──────────────────────────────────────────────────────────────
   STATE
────────────────────────────────────────────────────────────── */

let currentTopicId = null;
let currentLessonId = null;

/* ──────────────────────────────────────────────────────────────
   VIEW SWITCHING
────────────────────────────────────────────────────────────── */

function setActiveView(viewId) {
  document.querySelectorAll('.lessons-view').forEach(el => {
    el.classList.remove('view-active');
  });
  const target = document.getElementById(viewId);
  if (target) target.classList.add('view-active');
  scrollTo(0, 0);
}

/* ──────────────────────────────────────────────────────────────
   RENDER: TOPIC LIST
────────────────────────────────────────────────────────────── */

// ── "Continue Learning" banner — find next incomplete lesson ──

function renderContinueBanner() {
  const banner  = document.getElementById('lessons-continue-banner');
  const lblEl   = document.getElementById('lcb-title');
  const iconEl  = document.getElementById('lcb-icon');
  if (!banner || !lblEl) return;

  const progress = getProgress();
  let nextTopic  = null;
  let nextLesson = null;

  // Walk curriculum in order to find first incomplete lesson
  outer: for (const topic of CURRICULUM) {
    for (const lesson of topic.lessons) {
      const key = `${topic.id}/${lesson.id}`;
      if (!progress[key]) {
        nextTopic  = topic;
        nextLesson = lesson;
        break outer;
      }
    }
  }

  if (!nextTopic || !nextLesson) {
    // All done!
    banner.style.display = 'none';
    return;
  }

  // Don't show banner if no progress yet (new user — let them browse)
  const done = totalDoneCount();
  if (done === 0) { banner.style.display = 'none'; return; }

  banner.style.display = 'flex';
  if (iconEl) iconEl.textContent = nextTopic.icon;
  lblEl.textContent = nextLesson.title;

  banner.onclick = () => {
    showLessonDetail(nextTopic.id, nextLesson.id);
  };
}

function renderTopicList() {
  const container = document.getElementById('topic-list');
  if (!container) return;

  // Update totals
  const done = totalDoneCount();
  const total = CURRICULUM.reduce((s, t) => s + t.lessons.length, 0);
  const pct = total > 0 ? (done / total) * 100 : 0;

  document.getElementById('total-done').textContent = done;
  document.getElementById('total-lessons').textContent = total;
  const fill = document.getElementById('total-fill');
  if (fill) fill.style.width = `${pct}%`;

  // "Continue Learning" next-lesson banner
  renderContinueBanner();

  // Render cards
  container.innerHTML = CURRICULUM.map(topic => {
    const doneCount = topicDoneCount(topic);
    const lessonCount = topic.lessons.length;
    const pctTopic = Math.round((doneCount / lessonCount) * 100);
    const allDone = doneCount === lessonCount;
    const started = doneCount > 0 && !allDone;
    const leftCount = lessonCount - doneCount;

    let stateClass = `topic-color-${topic.color}`;
    if (allDone) stateClass += ' done';
    else if (started) stateClass += ' started';

    const progressLabel = allDone
      ? '✓ Complete'
      : doneCount === 0
        ? `${lessonCount} lessons`
        : `${leftCount} lesson${leftCount !== 1 ? 's' : ''} left`;

    return `
      <button class="topic-card ${stateClass}" data-topic="${topic.id}">
        <div class="topic-thumb">
          <span class="topic-thumb-icon">${topic.icon}</span>
          ${allDone ? '<span class="topic-thumb-badge">✓ Done</span>' : ''}
        </div>
        <div class="topic-body">
          <div class="topic-title">${topic.title}</div>
          <div class="topic-meta">${lessonCount} lessons · ${allDone ? 'Complete ✓' : doneCount === 0 ? 'Not started' : `${doneCount} of ${lessonCount} done`}</div>
          <div class="topic-prog-row">
            <div class="topic-prog-track">
              <div class="topic-prog-fill" style="width:${pctTopic}%"></div>
            </div>
            <span class="topic-prog-label">${progressLabel}</span>
          </div>
        </div>
      </button>
    `;
  }).join('');

  // Wire up click handlers
  container.querySelectorAll('.topic-card').forEach(card => {
    card.addEventListener('click', () => showLessonList(card.dataset.topic));
  });
}

/* ──────────────────────────────────────────────────────────────
   RENDER: LESSON LIST
────────────────────────────────────────────────────────────── */

function renderLessonList(topic) {
  // Topic header
  document.getElementById('topic-header-icon').textContent = topic.icon;
  document.getElementById('topic-header-title').textContent = topic.title;

  // Progress bar
  const doneCount = topicDoneCount(topic);
  const lessonCount = topic.lessons.length;
  const pct = (doneCount / lessonCount) * 100;
  const fill = document.getElementById('topic-fill');
  if (fill) fill.style.width = `${pct}%`;
  document.getElementById('topic-progress-label').textContent = `${doneCount} / ${lessonCount}`;

  // Lesson rows
  const container = document.getElementById('lesson-list');
  if (!container) return;

  container.innerHTML = topic.lessons.map((lesson, idx) => {
    const done = isDone(topic.id, lesson.id);
    // First undone lesson is "active" (next to do)
    const prevAllDone = idx === 0 || topic.lessons.slice(0, idx).every(l => isDone(topic.id, l.id));
    const isActive = !done && prevAllDone;

    let rowClass = 'lesson-row';
    if (done) rowClass += ' done';
    else if (isActive) rowClass += ' active';

    const statusContent = done ? '✓' : (isActive ? '' : '');

    return `
      <button class="${rowClass}" data-topic="${topic.id}" data-lesson="${lesson.id}">
        <span class="lesson-status-icon">${statusContent}</span>
        <div class="lesson-info">
          <div class="lesson-title">${lesson.title}</div>
          <div class="lesson-meta">⏱ ${lesson.duration}</div>
        </div>
      </button>
    `;
  }).join('');

  // Wire up clicks
  container.querySelectorAll('.lesson-row').forEach(row => {
    row.addEventListener('click', () => {
      showLessonDetail(row.dataset.topic, row.dataset.lesson);
    });
  });
}

/* ──────────────────────────────────────────────────────────────
   RENDER: LESSON DETAIL
────────────────────────────────────────────────────────────── */

function renderLessonDetail(topic, lesson) {
  // Duration badge + lesson position in topic
  const lessonNum = topic.lessons.findIndex(l => l.id === lesson.id) + 1;
  const lessonTotal = topic.lessons.length;
  document.getElementById('lesson-duration').textContent = `⏱ ${lesson.duration}`;

  // Show lesson position in topbar area (after duration badge)
  const durationEl = document.getElementById('lesson-duration');
  if (durationEl) {
    durationEl.innerHTML = `⏱ ${lesson.duration} &nbsp;·&nbsp; <span style="opacity:0.65">${lessonNum} of ${lessonTotal}</span>`;
  }

  // Article content
  const article = document.getElementById('lesson-article');
  if (article) {
    article.innerHTML = `
      <h2 class="lesson-title-main">${lesson.title}</h2>
      <p class="lesson-intro">${lesson.intro}</p>
      <div class="lesson-points">
        ${lesson.points.map((point, i) => `
          <div class="lesson-point-card" style="animation-delay:${i * 0.07}s">
            <div class="point-num">${i + 1} / ${lesson.points.length}</div>
            <div class="point-heading">${point.heading}</div>
            <div class="point-body">${point.body}</div>
          </div>
        `).join('')}
      </div>
      <div class="lesson-takeaway">
        <span class="takeaway-label">💡 Key Takeaway</span>
        <span class="takeaway-text">${lesson.takeaway}</span>
      </div>
    `;
  }

  // Reading progress bar
  initReadingProgress();

  // Action buttons
  renderLessonActions(topic, lesson);
}

function renderLessonActions(topic, lesson) {
  const container = document.getElementById('lesson-actions');
  if (!container) return;

  const done = isDone(topic.id, lesson.id);

  // Find next lesson
  const lessonIdx = topic.lessons.findIndex(l => l.id === lesson.id);
  const nextLesson = topic.lessons[lessonIdx + 1] || null;

  // Find next topic
  const topicIdx = CURRICULUM.findIndex(t => t.id === topic.id);
  const nextTopic = !nextLesson ? (CURRICULUM[topicIdx + 1] || null) : null;

  // ── Quiz practice map ──────────────────────────────────────
  const TOPIC_QUIZ_MAP = {
    'foundations':       'AI Foundations',
    'data-prep':         'Data Preparation',
    'model-building':    'Model Building',
    'ai-app-dev':        'AI App Development',
    'deployment-ethics': 'Deployment and Responsible AI',
  };
  const quizLevel = TOPIC_QUIZ_MAP[topic.id];

  let html = '';

  if (done) {
    // Already complete — show completed badge then navigation
    html += `<button class="btn-done completed" disabled>✓ Completed</button>`;
    if (nextLesson) {
      html += `<button class="btn-next-lesson" id="btn-next-lesson" data-topic="${topic.id}" data-lesson="${nextLesson.id}">Next Lesson →</button>`;
    } else if (nextTopic) {
      html += `<button class="btn-next-lesson" id="btn-next-topic" data-topic="${nextTopic.id}">Next Topic →</button>`;
    }
  } else {
    // Not complete — combine mark-done + advance into one button
    if (nextLesson) {
      html += `<button class="btn-done btn-done-advance" id="btn-mark-done" data-next-topic="${topic.id}" data-next-lesson="${nextLesson.id}">Done &amp; Next →</button>`;
    } else if (nextTopic) {
      html += `<button class="btn-done btn-done-advance" id="btn-mark-done" data-next-topic="${nextTopic.id}" data-next-type="topic">Done &amp; Next Topic →</button>`;
    } else {
      // Last lesson in entire curriculum
      html += `<button class="btn-done" id="btn-mark-done">Mark as Done ✓</button>`;
    }
  }

  if (quizLevel) {
    html += `<a class="btn-quiz-topic" href="/?level=${encodeURIComponent(quizLevel)}" title="Practice quiz on ${topic.title}">🎮 Practice Quiz</a>`;
  }

  // Ask Alex — pre-fill with lesson title
  const alexQ = encodeURIComponent(`Can you explain "${lesson.title}" from the ${topic.title} topic in simple terms? Give me a real-world analogy.`);
  html += `<a class="btn-ask-alex-lesson" href="/chat.html?q=${alexQ}" title="Ask Alex about this lesson">🤖 Ask Alex</a>`;

  container.innerHTML = html;

  // Mark done handler
  const btnDone = document.getElementById('btn-mark-done');
  if (btnDone) {
    btnDone.addEventListener('click', () => {
      markDone(topic.id, lesson.id);

      // Brief visual confirmation before advancing
      btnDone.textContent = '✓ Done!';
      btnDone.classList.add('completed');
      btnDone.disabled = true;

      const nextType   = btnDone.dataset.nextType;    // 'topic' or undefined
      const nextTopic2 = btnDone.dataset.nextTopic;
      const nextLesson2 = btnDone.dataset.nextLesson;

      if (nextTopic2) {
        setTimeout(() => {
          if (nextType === 'topic') showLessonList(nextTopic2);
          else                     showLessonDetail(nextTopic2, nextLesson2);
        }, 420);
      } else {
        // End of curriculum — just re-render the action buttons
        setTimeout(() => renderLessonActions(topic, lesson), 420);
      }
    });
  }

  // Next lesson / topic handlers (shown when lesson is already done)
  const btnNextLesson = document.getElementById('btn-next-lesson');
  if (btnNextLesson) {
    btnNextLesson.addEventListener('click', () => {
      showLessonDetail(btnNextLesson.dataset.topic, btnNextLesson.dataset.lesson);
    });
  }

  const btnNextTopic = document.getElementById('btn-next-topic');
  if (btnNextTopic) {
    btnNextTopic.addEventListener('click', () => {
      showLessonList(btnNextTopic.dataset.topic);
    });
  }
}

/* ──────────────────────────────────────────────────────────────
   NAVIGATION
────────────────────────────────────────────────────────────── */

function showTopics() {
  renderTopicList();
  setActiveView('view-topics');
  currentTopicId = null;
  currentLessonId = null;
}

function showLessonList(topicId) {
  const topic = CURRICULUM.find(t => t.id === topicId);
  if (!topic) return;
  currentTopicId = topicId;
  currentLessonId = null;
  renderLessonList(topic);
  setActiveView('view-lessons');
}

function showLessonDetail(topicId, lessonId) {
  const topic = CURRICULUM.find(t => t.id === topicId);
  if (!topic) return;
  const lesson = topic.lessons.find(l => l.id === lessonId);
  if (!lesson) return;
  currentTopicId = topicId;
  currentLessonId = lessonId;
  renderLessonDetail(topic, lesson);
  setActiveView('view-detail');
}

/* ──────────────────────────────────────────────────────────────
   READING PROGRESS BAR
────────────────────────────────────────────────────────────── */

let _rpScrollHandler = null;

function initReadingProgress() {
  const fill   = document.getElementById('lrp-fill');
  const detail = document.getElementById('view-detail');
  if (!fill || !detail) return;

  // Remove old listener if any
  if (_rpScrollHandler) {
    detail.removeEventListener('scroll', _rpScrollHandler);
  }

  // Reset to 0
  fill.style.width = '0%';

  _rpScrollHandler = () => {
    const scrollTop  = detail.scrollTop;
    const scrollH    = detail.scrollHeight - detail.clientHeight;
    if (scrollH <= 0) { fill.style.width = '100%'; return; }
    const pct = Math.min(100, Math.round((scrollTop / scrollH) * 100));
    fill.style.width = pct + '%';
  };

  detail.addEventListener('scroll', _rpScrollHandler, { passive: true });
}

/* ──────────────────────────────────────────────────────────────
   THEME TOGGLE
────────────────────────────────────────────────────────────── */

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
  const metaEl = document.getElementById('meta-theme-color');
  if (metaEl) metaEl.setAttribute('content', theme === 'light' ? '#f0eff8' : '#07060c');
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  try { localStorage.setItem('aiChallenge_theme', next); } catch { /* ignore */ }
  applyTheme(next);
}

/* ──────────────────────────────────────────────────────────────
   INIT
────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme
  let savedTheme = 'dark';
  try { savedTheme = localStorage.getItem('aiChallenge_theme') || 'dark'; } catch { /* ignore */ }
  applyTheme(savedTheme);

  // Theme toggle button
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // Back buttons
  const backToTopics = document.getElementById('back-to-topics');
  if (backToTopics) backToTopics.addEventListener('click', showTopics);

  const backToLessonList = document.getElementById('back-to-lesson-list');
  if (backToLessonList) {
    backToLessonList.addEventListener('click', () => {
      if (currentTopicId) showLessonList(currentTopicId);
      else showTopics();
    });
  }

  // Show initial view — support ?topic=ID and ?topic=ID&lesson=ID deep-links
  (function initDeepLink() {
    try {
      const params   = new URLSearchParams(window.location.search);
      const topicId  = params.get('topic');
      const lessonId = params.get('lesson');
      if (topicId && lessonId) {
        showLessonDetail(topicId, lessonId);
        return;
      }
      if (topicId) {
        showLessonList(topicId);
        return;
      }
    } catch {}
    showTopics();
  })();

  // Track visit for activity calendar
  try {
    const d   = new Date();
    const str = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    let dates = JSON.parse(localStorage.getItem('aiChallenge_visitDates') || '[]');
    if (!dates.includes(str)) {
      dates.push(str);
      if (dates.length > 90) dates = dates.slice(-90);
      localStorage.setItem('aiChallenge_visitDates', JSON.stringify(dates));
    }
  } catch {}

  // Keyboard nav in lesson detail view
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const detailView = document.getElementById('view-detail');
    if (!detailView || !detailView.classList.contains('view-active')) return;

    if (e.key === 'ArrowLeft' || e.key === 'Escape') {
      // Go back
      if (currentTopicId) showLessonList(currentTopicId);
      else showTopics();
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      // Next lesson — click the next button if available
      const nextBtn = document.getElementById('btn-next-lesson') || document.getElementById('btn-next-topic');
      if (nextBtn) nextBtn.click();
    } else if (e.key === 'm' || e.key === 'M') {
      // Mark as done
      const doneBtn = document.getElementById('btn-mark-done');
      if (doneBtn) doneBtn.click();
    }
  });
});


// ── Touch swipe navigation in lesson detail (mobile) ───────────
(function initSwipeNav() {
  let startX = 0;
  let startY = 0;

  document.addEventListener('touchstart', e => {
    startX = e.changedTouches[0].clientX;
    startY = e.changedTouches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const detailView = document.getElementById('view-detail');
    if (!detailView || !detailView.classList.contains('view-active')) return;

    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;

    // Ignore mostly-vertical swipes (scrolling)
    if (Math.abs(dy) > Math.abs(dx) * 1.5) return;
    if (Math.abs(dx) < 50) return; // Too short

    if (dx < 0) {
      // Swipe left → next lesson
      const nextBtn = document.getElementById('btn-next-lesson') || document.getElementById('btn-next-topic');
      if (nextBtn) nextBtn.click();
    } else {
      // Swipe right → back
      if (currentTopicId) showLessonList(currentTopicId);
      else showTopics();
    }
  }, { passive: true });
})();

// ── Lesson search ──────────────────────────────────────────────
(function initLessonsSearch() {
  const input = document.getElementById('lessons-search');
  if (!input) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    const topicCards = document.querySelectorAll('.topic-card');
    const lessonCards = document.querySelectorAll('.lesson-item');

    if (!q) {
      topicCards.forEach(c => c.style.display = '');
      lessonCards.forEach(c => c.style.display = '');
      return;
    }

    topicCards.forEach(c => {
      const text = c.textContent.toLowerCase();
      c.style.display = text.includes(q) ? '' : 'none';
    });
    lessonCards.forEach(c => {
      const text = c.textContent.toLowerCase();
      c.style.display = text.includes(q) ? '' : 'none';
    });
  });
})();

// ── AI Fact of the Day ─────────────────────────────────────────
(function initAIFact() {
  const el = document.getElementById('ai-fact-strip');
  const textEl = document.getElementById('ai-fact-text');
  if (!el || !textEl) return;

  const FACTS = [
    'The term "Artificial Intelligence" was coined by John McCarthy in 1956 at the Dartmouth Conference.',
    'GPT-4 was trained on roughly 1 trillion tokens — about the equivalent of 1 million novels.',
    'A "token" in an LLM is roughly ¾ of a word on average. "ChatGPT" is a single token.',
    'The transformer architecture, which powers most modern AI, was introduced by Google researchers in 2017.',
    'AlphaGo defeated world Go champion Lee Sedol 4–1 in 2016 — a feat thought to be decades away.',
    'Gradient descent was first described in 1847 by mathematician Augustin-Louis Cauchy.',
    'DALL·E\'s name is a blend of Salvador Dalí and Pixar\'s WALL·E.',
    'The first chatbot, ELIZA, was created in 1966 at MIT. It could hold a conversation by pattern matching.',
    '"Hallucination" in AI means confidently generating false information — a fundamental challenge in LLMs.',
    'Overfitting occurs when a model memorises training data instead of learning general patterns.',
    'RLHF (Reinforcement Learning from Human Feedback) is the technique used to align ChatGPT to human values.',
    'The word "robot" comes from the Czech word "robota," meaning forced labour or drudgery.',
    'Moore\'s Law predicted transistor counts double every ~2 years — AI compute has grown even faster.',
    'Backpropagation, the algorithm that trains neural networks, was popularised by Rumelhart et al. in 1986.',
    'Claude, Gemini, and GPT are all "autoregressive" models — they predict one token at a time, left to right.',
    'The "attention mechanism" in transformers lets a model focus on relevant parts of the input dynamically.',
    'Fine-tuning adapts a pre-trained model to a specific task with a much smaller dataset.',
    'A perceptron, the simplest neural network, was built by Frank Rosenblatt in 1958.',
    'ImageNet, a dataset of 14 million labelled images, catalysed the deep learning revolution in 2012.',
    'Prompt engineering is the skill of writing instructions to get the best outputs from language models.',
    'In 2023, AI generated images won a prestigious fine arts competition — sparking a global debate on creativity.',
    'Vector embeddings convert words and concepts into numbers so models can measure semantic similarity.',
    'Retrieval-Augmented Generation (RAG) lets AI answer questions using documents it was never trained on.',
    'The Turing Test — proposed in 1950 — asks whether a human can tell if they\'re talking to a machine.',
    'Diffusion models (like Stable Diffusion) generate images by learning to reverse a noisy "corruption" process.',
    'Reinforcement learning trained OpenAI\'s Five to beat human world champions at the game Dota 2.',
    'In AI, "context window" refers to how much text a model can process at once — now up to millions of tokens.',
    'Transfer learning lets a model trained on one task (e.g., language) be adapted to completely different tasks.',
    'The first AI "winter" happened in the 1970s when funding dried up after early systems failed to scale.',
    'Edge AI runs models directly on devices (phones, sensors) without sending data to a server.',
    '"Stochastic" means involving randomness — SGD (Stochastic Gradient Descent) uses random mini-batches.',
    'A confusion matrix in ML shows true positives, false positives, true negatives, and false negatives.',
    'BERT, Google\'s language model, was the first to read text in both directions simultaneously (bidirectional).',
    'Neural scaling laws show model performance improves predictably as you add more data and compute.',
    'The AI safety field studies how to build AI systems that are reliably beneficial and aligned with human values.',
  ];

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  let factIdx = dayOfYear % FACTS.length;

  function showFact() {
    textEl.textContent = FACTS[factIdx % FACTS.length];
  }

  showFact();

  el.addEventListener('click', () => {
    factIdx = (factIdx + 1) % FACTS.length;
    // Brief fade + slide animation
    textEl.style.opacity = '0';
    textEl.style.transform = 'translateY(4px)';
    textEl.style.transition = 'opacity 0.15s, transform 0.15s';
    setTimeout(() => {
      showFact();
      textEl.style.opacity = '1';
      textEl.style.transform = 'translateY(0)';
    }, 150);
  });
})();
