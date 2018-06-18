'use strict';

tatool
  .factory('inhibitionGoNogoNew', [ 'executableUtils', 'dbUtils', 'timerUtils', 'stimulusServiceFactory', 'inputServiceFactory',
    function (executableUtils, dbUtils, timerUtils, stimulusServiceFactory, inputServiceFactory) {

    var GoNogo = executableUtils.createExecutable();

    var DISPLAY_DURATION_DEFAULT = 2000;
    var DISPLAY_CROSS_DURATION_DEFAULT = 200;
    //var inhibitionCount = 0;
    //var inhibitionStimuli = [];
    //var total = 0;

    //  Initialze variables at the start of every session
    GoNogo.prototype.init = function() {
      var deferred = executableUtils.createPromise();

      if (!this.showKeys) {
        this.showKeys = { propertyValue: true };
      } else {
        this.showKeys.propertyValue = (this.showKeys.propertyValue === true) ? true : false;
      }

      if (!this.timerEnabled) {
        this.timerEnabled = { propertyValue: true };
      } else {
        this.timerEnabled.propertyValue = (this.timerEnabled.propertyValue === true) ? true : false;
      }

      if (!this.stimuliPath) {
        deferred.reject('Invalid property settings for Executable inhibitionGoNogo. Expected property <b>stimuliPath</b> of type Path.');
      }

      // template properties
      //this.stimulusServiceLeft = stimulusServiceFactory.createService(this.stimuliPath);
      //this.stimulusServiceRight = stimulusServiceFactory.createService(this.stimuliPath);
      this.stimulusServiceCenter = stimulusServiceFactory.createService(this.stimuliPath);
      this.inputService = inputServiceFactory.createService(this.stimuliPath);

      // timing properties
      this.displayDuration = (this.displayDuration ) ? this.displayDuration : DISPLAY_DURATION_DEFAULT;
      this.displayCrossDuration = (this.displayCrossDuration ) ? this.displayCrossDuration : DISPLAY_CROSS_DURATION_DEFAULT;
      this.crossTimer = timerUtils.createTimer(this.displayCrossDuration, false, this);
      this.timer = timerUtils.createTimer(this.displayDuration, true, this);

      // trial counter property
      this.counter = 0;

      // prepare stimuli
      if (this.stimuliFile) {
        var self = this;
        executableUtils.getCSVResource(this.stimuliFile, true, this.stimuliPath).then(function(list) {
            self.processStimuliFile(list, deferred);
          }, function(error) {
            deferred.reject('Resource not found: ' + self.stimuliFile.resourceName);
          });
      } else {
        deferred.reject('Invalid property settings for Executable inhibitionGoNogo. Expected property <b>stimuliFile</b> of type Resource.');
      }


      return deferred;
    };

    // process stimuli file according to randomisation property
    GoNogo.prototype.processStimuliFile = function(list, deferred) {
      if (this.randomisation === 'full-condition') {
        this.stimuliList = this.splitStimuliList(list);
      } else if (this.randomisation === 'full') {
        this.stimuliList = executableUtils.shuffle(list);
      } else {
        this.stimuliList = list;
      }

      this.totalStimuli = list.length;
      this.setupInputKeys(list);
      deferred.resolve();
    };

    // Splitting the stimuliList according to stimulusType for full-condition and randomise
    GoNogo.prototype.splitStimuliList = function(list) {
      var newList = {};
      for (var i = 0; i < list.length; i++) {
        var stimulusType = list[i].stimulusType;
        if(!newList[stimulusType]) {
          newList[stimulusType] = [];
        }
        newList[stimulusType].push(list[i]);
      }

      return newList;
    };

    // Adding keyInputs and show by default
    GoNogo.prototype.setupInputKeys = function(list) {
      var keys = this.inputService.addInputKeys(list, !this.showKeys.propertyValue);

      if (keys.length === 0) {
        executableUtils.fail('Error creating input template for Executable inhibitionGoNogo. No keyCode provided in stimuliFile.');
      }
    };

    // Create stimulus and set properties
    GoNogo.prototype.createStimulus = function() {
      // reset executable properties
      this.startTime = 0;
      this.endTime = 0;

      // reset counter to 0 if > no. of total stimuli
      if (this.counter >= this.totalStimuli) {
        this.counter = 0;
        if (this.randomisation === 'full') {
          this.stimuliList = executableUtils.shuffle(this.stimuliList);
        }
      }

      // create new trial
      this.trial = {};
      this.trial.givenResponse = null;
      this.trial.reactionTime = 0;
      this.trial.score = null;

      // pick stimulus to display
      var stimulus = null;
      if (this.randomisation === 'full-condition') {
        stimulus = this.createRandomConditionStimulus();
      } else if (this.randomisation === 'full') {
        stimulus = this.createRandomStimulus();
      } else {
        stimulus = this.createNonRandomStimulus();
      }

      if (stimulus === null) {
        executableUtils.fail('Error creating stimulus in Executable inhibitionGoNogo. No more stimuli available in current stimuliList.');
      } else {
        this.trial.stimulusValue = stimulus.stimulusValue;
        this.trial.stimulusType = stimulus.stimulusType;
        //this.trial.stimulusPosition = stimulus.stimulusPosition;
        this.trial.correctResponse = stimulus.correctResponse;

        this.stimulusServiceCenter.set(stimulus);
        this.currentStimulusService = this.stimulusServiceCenter;

        //if (stimulus.stimulusPosition === 'left') {
        //  this.stimulusServiceLeft.set(stimulus);
        //  this.currentStimulusService = this.stimulusServiceLeft;
        //} else {
        //  this.stimulusServiceRight.set(stimulus);
        //  this.currentStimulusService = this.stimulusServiceRight;
        //}
      }

      // increment trial index counter
      this.counter++;
    };

    GoNogo.prototype.createRandomConditionStimulus = function() {
      // get random stimuliType with replacement
      var stimuliType = executableUtils.getRandomReplace(this.stimuliList);

      // get random stimulus out of selected stimuliType
      var  randomStimulus = executableUtils.getRandomReplace(stimuliType);
      return randomStimulus;
    };

    GoNogo.prototype.createRandomStimulus = function() {
      // get random stimulus out of selected stimuliType
      var  randomStimulus = executableUtils.getNext(this.stimuliList, this.counter);
      return randomStimulus;
    };

    GoNogo.prototype.createNonRandomStimulus = function() {
      // get stimulus next replacement
      var nonRandomStimulus = executableUtils.getNext(this.stimuliList, this.counter);
      return nonRandomStimulus;
    };

    //GoNogo.prototype.createInhibitionStimulus = function() {
      // get random stimuliType with replacement
    //  var inhibitionStimulus = {stimulusType:"incongruent", stimulusValue:"black_arrow_both.png", stimulusValueType:"image",correctResponse:"", keyCode:"", response:"",keyIndex: ""};
    //  return inhibitionStimulus;
    //};

    // Process given response and stop executable
    GoNogo.prototype.processResponse = function(givenResponse) {
      this.trial.reactionTime = this.endTime - this.startTime;
      this.trial.givenResponse = givenResponse;
      if (this.trial.correctResponse == this.trial.givenResponse) {
        this.trial.score = 1;
      } else {
        this.trial.score = 0;
      }
      dbUtils.saveTrial(this.trial).then(executableUtils.stop);
    };

    return GoNogo;

  }]);
