'use strict';

// When this gets called, Danny passes the jQuery object as an argument.
// The $ in the parameter here is just a parameter like any other -- nothing special.
// It becomes jQuery when used anywhere in this space.
var Omnisurvey_GroupingSelection = function($, data, groupingId, surveyId, collectionId) {

	this.nextButtonHandler;
	this.surveySelectionHandler; // 20201029-0357: This goes to code that's commented out right now. Not sure why.
	this.dataToEmbed = {}; // this object holds the data to embed in the survey

	var self = this;
	const surveySelectionQuestionId = 'QID182';
	const strGroupingImageRootDir = 'https://knowrivalry.com/images/entlogos/';
	
	// A note on the variable notation:
		// If the variable has a $ before it, it's a jQuery object. 
		// For example, in `surveySelectionQuestionId = 'QID182'`, surveySelectionQuestionId is just a string.
		// The jQuery object equivalent is $surveySelectionQuestion = $('#'+surveySelectionQuestionId)
		// The $('#'+surveySelectionQuestionId) is the same as jQuery('#'+surveySelectionQuestionId) because jQuery was passed to Omnisurvey_GroupingSelection.
		// So $('#'+surveySelectionQuestionId) is the same as writing jQuery("#QID182")

	const $surveySelectionQuestion = $('#'+surveySelectionQuestionId); // Survey question div with all the radio buttons for choosing your desired grouping
	const $nextButton = $('#SplashMyNextButton'); 	// My custom next button
	const $splashChangeGroupingBtn = $('#SplashChangeGroupingBtn'); // Button to allow the user to pick a different grouping
	const $SplashWelcomeGroupingLogoDiv = $('#SplashWelcomeGroupingLogoDiv'); // Div with the grouping logo
	const $storageGroupingId = $("#storageGroupingId"); // Storage for the selected grouping
	const $storageCollectionId = $("#storageCollectionId"); // Storage for the selected collection
	
	// The toggleGroupingSelect function would only be called -- I think -- if the user clicks on SplashChangeGroupingBtn
	function toggleGroupingSelect() {
		$surveySelectionQuestion.slideToggle();

		// The "Select different grouping" button doesn't show if the surveySelectionQuestion is already showing
		if ($splashChangeGroupingBtn.css('visibility') === 'hidden') {
			$splashChangeGroupingBtn.css('visibility', 'visible');
		} else {
			$splashChangeGroupingBtn.css('visibility', 'hidden');
		}

		fScrollToSelectGrpID();
	}

	// Return user to the Select grpID question
	function fScrollToSelectGrpID() {
		$('html, body').animate({
			scrollTop: ($("#SplashTitleText").offset().top)
		},500);
	}
	function fErrorText(paramElementID, paramIsError){
		// I made this more flexible than it needed to be, but I figured it was better to do it this way for the future
		let strErrorText = "";
		if (paramIsError === true) {		// There is an error!
			switch (paramElementID) {		// Which element has the error?
				case "SplashErrorSelectGrouping":
					strErrorText += "Please select a league before trying to continue.";
					break;
				default:
					strErrorText += "";
			}
		} else {
			strErrorText = "";
		}
		$("#"+paramElementID).html(strErrorText); // Set the text within the HTML element
	}

	function submitPageData() {
		// TASKS BEFORE ADVANCING IN SURVEY
		// The main thing this function does is to write the values into the embedded data variables within Qualtrics.
		// In some cases we want to write new embedded data, in other cases we don't, thus we need to write it with code rather than within the Qualtrics Survey Flow.		

		// Get the groupingId and, if present, the collectionId
		const groupingId = parseInt($storageGroupingId.text());
		const collectionId = parseInt($storageCollectionId.text());

		// If the grpID is null/empty/NaN/0, check to see if the user has made a selection
		if (!(groupingId > 0)) {
			fErrorText("SplashErrorSelectGrouping", true); // Put error text above the grouping selector question
			fScrollToSelectGrpID(); // Scroll user back to the grouping selector question
			return false;
		}
				
		// WRITE THE EMBEDDED DATA TO QUALTRICS
		// This will write EVERY property within the data table variables as an embedded data variable within Qualtrics (whether we end up using it or not).
		// The variables from the JSON files: groupings.json & surveys.json (formerly tbljsGroupings & tbljsSurveys) 
		// If the embedded data element doesn't exist in the survey flow yet, Qualtrics will create that variable.
		// You won't see it in the Qualtrics survey flow, but it exists [at least, I think that's what's happening].
	
		self.dataToEmbed = {};
		
		// write all properties of groupings.json for selected grouping to embedded data
		const selectedGrouping = data.getGrouping(groupingId);
		$.each(selectedGrouping, function(key) {
			self.dataToEmbed[key] = selectedGrouping[key];
		});

		// write all properties of surveys.json for selected survey to embedded data
		const surveyId = selectedGrouping.grpCurrentSurvID;
		const selectedSurvey = data.getSurvey(surveyId);
		$.each(selectedSurvey, function(key) {
			self.dataToEmbed[key] = selectedSurvey[key];
		});

		// write all properties of collections.json for selected survey to embedded data
		const selectedCollection = data.getCollection(collectionId);
		$.each(selectedCollection, function(key) {
			self.dataToEmbed[key] = selectedCollection[key];
		});

		console.log('Submitting data:', self.dataToEmbed);

		return true;
	}

	// change the grouping showcased on the page
	function setGroupingInfo(groupingId) { // Danny named this selectGrouping(id)
		$storageGroupingId.text(groupingId); // Store the groupingId in a hidden div on the page
		const groupingImgFilename = strGroupingImageRootDir + 'logo_ent' + groupingId + '.svg';
		$SplashWelcomeGroupingLogoDiv.css('background-image', 'url(' + groupingImgFilename + ')');
	}

	// This is called from the HTML when the user has clicked on a grouping selection
	this.groupingSelectionHandler = function(selectedGroupingId) {
		if (!isNaN(selectedGroupingId)) {
			setGroupingInfo(selectedGroupingId);
			toggleGroupingSelect();
		}
	};
	
	// This fires when the user clicks to change the grouping
	function changeGroupingButtonHandler() {
		toggleGroupingSelect();
	}

	// Runs on page load
	function init() {

		// These will be set by the code
		let grouping = null, survey = null, collection = null;

		// Fetches an object with that grouping's information.
		if (groupingId > 0) {
			// This means a groupingId was passed in the query string (i.e., it's in the embedded data)
			// e.g., {"grpID":7,"grpSport":"Cricket","termKRQualtrics":"BBL", etc.
			grouping = data.getGrouping(groupingId);
		}

		if (collectionId > 0) {
			collection = data.getCollection(collectionId); // { collID: 2, collName: "MLS League Case Study" }
		}

		if (surveyId > 0) {
			// This means a survID was passed in the query string (i.e., it's in the embedded data)
			survey = data.getSurvey(surveyId);

			if (survey != null) {
				// get the groupings associated with this survey
				const groupings = data.getGroupingsBySurvey(surveyId);

				if (groupings != null) {
					// TODO: ONLY DISPLAY THESE LEAGUES

				}
			}
		}
		
		// By default, the survey selection question is hidden
		  // If there is a grpID assigned, hide/show the appropriate elements
		  // If not, give the user the opportunity to select the grouping
		if (grouping != null) {

			// if survey isn't specified or
			  // the survey is specified and the grouping is explicity associated with a surveyId,
			  // don't give the user the opportunity to change groupings
			if (survey == null || grouping.grpCurrentSurvID === survey.survID) {
				// Hide the survey question with all the selector radio boxes
				$surveySelectionQuestion.hide();
				// Put the logo for the grouping at the top of the survey
				setGroupingInfo(groupingId);
			} else {
				// Allow user to click button to change groupings
				toggleGroupingSelect();
			}
		} else {
			toggleGroupingSelect();
		}
		
		// Customize the style of Qualtrics elements
		function customStyleGroupingSelectionPage(){
			// Reduce the distance between elements. Tighten up the page.
			$('.Skin .QuestionOuter').css('padding-bottom', '0vh');
			// Reduce the distance between grouping buttons
			$surveySelectionQuestion.css({"padding-top": "5px","padding-bottom": "5px"});
		};
		customStyleGroupingSelectionPage();

		$splashChangeGroupingBtn.on('click', changeGroupingButtonHandler);

		// RUN CODE ON PAGE SUBMIT
		$nextButton.on('click', function() {
			return submitPageData() && (typeof self.nextButtonHandler === 'function' && self.nextButtonHandler());
		});

	}

	init();	
};