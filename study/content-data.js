// Compact summary bank for Romy Study period 1B.
// Topic maps are grounded in the user's uploaded/current course materials.
window.ROMY_STUDY_CONTENT={
  insp:{
    sourceLabel:'Bestaande samenvatting Inspanningsfysiologie',
    blocks:[
      {title:'College 1',topics:['Homeostase en regelsystemen','Sensor · regelcentrum · effector','Arbeid en vermogen','Energieverbruik en VO₂','Energiesystemen en cardiopulmonale basis']},
      {title:'College 2',topics:['Metabolisme','ATP als energievaluta','Aerobe en anaerobe stofwisseling','Koolhydraten, vetten en eiwitten','Enzymen en energieproductie']},
      {title:'College 3',topics:['Hormonale regulatie','Neurale versus humorale route','Hydrofiele en hydrofobe hormonen','Endocriene klieren','Hypothalamus en hypofyse']},
      {title:'College 4',topics:['Cardiac output','Hartfrequentie × slagvolume','Elektrische geleiding van het hart','Excitatie-contractiekoppeling','Bloeddruk en circulatie tijdens inspanning']}
    ]
  },
  ba2:{
    sourceLabel:'Bestaande samenvatting Bewegingsanalyse 2',
    blocks:[
      {title:'College 1',topics:['Kinematica','Globaal en lokaal assenstelsel','Vectoren en kruisproduct','Vrijheidsgraden','Foutpropagatie']},
      {title:'College 2',topics:['Continue versus discrete data','Numeriek differentiëren en integreren','Filtering en drift','Dynamica','Bewegingsmeetsystemen en sensoren']},
      {title:'College 3',topics:['Loopcyclus','Stand-, bipedale en zwaaifase','Paslengte en pasfrequentie','Loopsnelheid','Temporale loopparameters']},
      {title:'College 4',topics:['Slinger en resonantie','Inverted pendulum model','Statisch evenwicht','Centre of pressure en centre of mass','Enkelstrategie en balans']},
      {title:'EMG & signaalanalyse',topics:['Oppervlakte-EMG','Ruis en filters','Sampling en aliasing','RMS en amplitude','Timing van spieractivatie']},
      {title:'Harmonische analyse',topics:['Periodieke signalen','Frequentie-inhoud','Data-compressie','Loopdata','Langetermijncorrelaties']}
    ]
  },
  ssp:{
    sourceLabel:'Statistical Signal Processing notes 2026/2027 + beschikbare oudere college-notebooks',
    overview:{
      purpose:'Mathematische basis voor parameter estimation, onzekerheden en model inference, met toepassingen uit astronomie en fysica.',
      language:'Engels',
      coding:'Python',
      math:'Veel matrix algebra',
      teaching:'Meestal 2 colleges + 1 computerpracticum per week',
      assessment:'Eén eindtentamen. Daarnaast 7 optionele tutorialopdrachten; de beste 5 tellen elk 3% als bonus mee, maximaal 15% / 1,5 punt. Het eindtentamen moet minimaal 4,5 zijn om het vak te halen.',
      aiRule:'Generatieve AI is niet toegestaan voor de korte tutorialopdrachten. Romy Study gebruikt AI daarom niet om deze opdrachten inhoudelijk op te lossen.'
    },
    structure:[
      '1. Overview & introduction',
      '2. Mathematical preliminaries',
      '3. Estimation theory — classical approach',
      '4. Estimation theory — Bayesian approach',
      '5. Applications & extensions'
    ],
    currentWeek:{
      title:'Week 1 · Introduction + mathematical preliminaries',
      objectives:['Globale doelen van statistical signal processing begrijpen','Benodigde wiskundige en statistische voorkennis ophalen'],
      topics:['Wat is statistical signal processing?','Measurement, modeling & inference','Probability density functions (PDFs)','Estimators en hun performance','Generative data model','Random vectors & processes','Conditional probability, Bayes’ theorem & marginalization','Expectation values & moments','Transformation of variables / Jacobian']
    },
    blocks:[
      {title:'1 · Introduction',topics:['Onzekere/noisy data modelleren','Measurement → modeling → inference','Detection & parameter estimation','Prediction en learning','Estimator θ̂ = g(x)','Generative data model x = Rs(θ) + ε']},
      {title:'2 · Mathematical preliminaries',topics:['Random vectors en processes','PDF en CDF','Gaussian / Poisson / binomial distributions','Conditional probability','Bayes’ theorem','Marginalization','Expectations, moments en covariance','Transformation of variables en Jacobian']},
      {title:'3 · Classical estimation theory',topics:['Unbiased, consistent & efficient estimators','Minimum variance unbiased estimator','Cramér–Rao Lower Bound','Fisher information','Linear models','Maximum Likelihood Estimation','Newton–Raphson','Least Squares & weighted least squares']},
      {title:'4 · Bayesian estimation theory',topics:['Likelihood, prior, evidence & posterior','MAP en Bayesian MSE estimators','Bayesian linear models','Marginalization','Nonlinear & hierarchical Bayesian models','Occam’s Razor','Monte Carlo en MCMC']},
      {title:'Oudere notebook · Lecture 2 (referentie)',topics:['Statistical modelling','Gaussian distributions & Central Limit Theorem','Linear regression','Parameter estimation','Likelihood','Prior','Posterior']},
      {title:'Oudere notebook · Lecture 3 (referentie)',topics:['Bayes’ theorem','Likelihood × prior → posterior','Bayesian line fitting','Correlatie tussen parameters','Invloed van priors','Occam’s Razor']}
    ],
    note:'De 2026/2027-notes zijn leidend. De notebooks uit 2023 gebruik ik alleen als extra uitleg/referentie en niet automatisch als exacte college-indeling voor 2026/2027.'
  }
};