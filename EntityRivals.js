'use strict';

var Omnisurvey_EntRivals = function ($, data, groupingId, entId) {
    const self=this; 

    this.entRivalsNextButtonHandler;

    // const questionId = 'QID246';
    const strEntDropdownSelector = 'select.ent-select';
    const strRivalPointsBoxSelector = 'input.riv-points-box';

    let $question = $('#rivSelTblWrapper');
    let $rivalryPointsError = $('#rivalPointsErrorBox');
    const $nextButton = $('#NextButton');
    
    let $rivalPointsInputs, $rivalryPointsTotal, $rivalPointsRemaining, $cboRivals;
    
    // Returns the containers for the current or next rival row when passed a jQuery object.
    // E.g., if a user changes the Rival01 dropdown, pass that here and it will return the Rival01 container, from which you can use .find() to pull any of its elements
    const $curRivContainer = ($select) => $select.closest('.rival-container');
    const $nextRivContainer = ($select) => $curRivContainer($select).next('.rival-container');

    const survIsInTestMode = $('#SurveyInTestMode').attr('id') !== undefined;

    // Usually use it to return Rival01, Rival02, etc.
    const fnRivalKey = (elem, regexToFind = "cbo", textToReplace ='') => elem.attr('id').replace(regexToFind, textToReplace);


    // Populate ents in second dropdown when user changes the grouping
    function changeGrouping($select) {
        // get the selected group id
        let groupId = parseInt($select.val());
        let entDropdown = $select.next('select');
        populateEnts(entDropdown, groupId);
    }

    // Fill the ents within the dropdown
    function populateEnts($select, groupId) {
        // get the ents in the grouping
        const ents = data.getEntsByGroup(groupId, 'termKRQualtrics');

        let options = '<option value=""></option>';
        ents.forEach(function (ent) {
            if (ent.entID != entId) {
                options += '<option value="' + ent.entID + '">' + ent.termKRQualtrics + '</option>';
            }
        });

        $select.html(options) // set options
            .change(); // trigger change
    }

    function selectEnt($select) {
        // $select is the rival dropdown element that was selected by the user (e.g., cboRival01)

        // Select the rivalry points inputs for this rival row (the box and the slider)
        const $rivalPointsInput = $curRivContainer($select).find('input');
        const $nextRival = $nextRivContainer($select);

        // Check if the entity dropdown is blank, then enable & disable accordingly.
        if ($select.val() === '' || $select.val()==0) {
            // Disable the rivalry points input box and set the value to 0 for this row and the next row
            const $nextRivalPointsInput = $nextRival.find(strRivalPointsBoxSelector);
            $.each([$rivalPointsInput, $nextRivalPointsInput],function(idx,elem){
                elem.attr({disabled: 'disabled', min: '0'}).val(0);
                $curRivContainer(elem).find('.ent-select.is-enabled').removeClass('is-enabled');
            });
            $nextRival.find('.grouping-select, .ent-select').attr({disabled:'disabled'});
        } else {
            // Enable this rival's input box
            $rivalPointsInput.removeAttr('disabled');
            // Emphasize available dropdown boxes
            $curRivContainer($select).find('.ent-select').addClass('is-enabled');
            $nextRivContainer($select).find('.ent-select').addClass('is-enabled');
            // If the points box as a value in it, leave the value. Otherwise, set the box to =1
            if (!$rivalPointsInput.val()){$rivalPointsInput.attr({min: '1'}).val(1)}; 
            // Enable the following rival selection boxes (if that rival row exists)
            $nextRival.find('.grouping-select, .ent-select').removeAttr('disabled');
        }
    
        // trigger change
        $rivalPointsInput.change();
    }

    function validate() {
        let isValidRivalsSelection = false;
        
        isValidRivalsSelection = check100Points();
        nextBtn(isValidRivalsSelection);

        // Enable or disable the next button
        function nextBtn(enableBtn){
            if (window.Qualtrics && Qualtrics.SurveyEngine) {
                const PageBtns = Qualtrics.SurveyEngine.Page.pageButtons;
                if (enableBtn){
                    PageBtns.enableNextButton(); 
                } else {
                    PageBtns.disableNextButton();
                }
            } else {
                if (enableBtn) {
					$nextButton.removeAttr('disabled');
				} else {
					$nextButton.attr('disabled', 'disabled');
				}
            }
            return enableBtn;
        }
        
        function setErrorMsg(errorText, textAction = 'show', otherParams={}){
            // Fetch any current text in the error box
            let strErrorMsg = $rivalryPointsError.html() || '',
                prefix='<br>';

            // Append the error message to any others already in the error box
            if (textAction == 'show'){ 
                prefix = (strErrorMsg.length == 0) ? '' : prefix
                if ( otherParams.rivalPointSum != 0 && !strErrorMsg.includes(errorText) ){
                    strErrorMsg += prefix + errorText;
                    $rivalryPointsError.html(strErrorMsg);
                }
            }

            // Remove the error message if it exists within the error box
            if (textAction == 'hide'){
                // If there's more than just this message in the box, remove the line return AND the message
                prefix = (errorText.length == strErrorMsg.length) ? '' : prefix
                // If this error isn't first, there will be a prefix. But it could be anywhere, so use regex
                strErrorMsg = strErrorMsg.replace( new RegExp( "("+prefix+")?"+errorText, "g" ), "" );
                strErrorMsg = strErrorMsg.replace( new RegExp(prefix), ""); // Removes the <br> that might be left at the front
                // Set the text within the DIV
                $rivalryPointsError.html(strErrorMsg);
            }
        }

        // RIVALRY POINT TOTAL
        function check100Points(){
            const strErrorMsg = "Rivalry points must total 100";
            let rivalPointSum = 0;

            // Start with a clean slate
            $rivalryPointsTotal.removeClass(['valid-point-total', 'rivalry-points-error']); 
            $rivalPointsRemaining.removeClass(['valid-point-total', 'rivalry-points-error']); 

            // Add all the points in rivalry points inputs fields
            $rivalPointsInputs.each(function () {
                rivalPointSum += Number($(this).val());
            });

            // Update the total points assigned div
            $rivalryPointsTotal.text('Assigned: ' + rivalPointSum);

            const intRivalPointsRemaining = 100-rivalPointSum;


            if (rivalPointSum == 100) {

                // Set the error message info
                $rivalryPointsTotal.addClass('valid-point-total');
                setErrorMsg(strErrorMsg, 'hide'); // hide error message

                // Update the points remaining div
                $rivalPointsRemaining.addClass('valid-point-total');
                $rivalPointsRemaining.text('All points allocated');
    
                return true;

            } else {
                // Set the error message info
                setErrorMsg(strErrorMsg, 'show',{rivalPointSum}); // show error message

                // Update the points remaining div
                const displayPts = Math.abs(intRivalPointsRemaining);
                if (rivalPointSum > 100){
                    $rivalPointsRemaining.text('Over: ' + displayPts);     
                    $rivalryPointsTotal.addClass('rivalry-points-error');  
                    $rivalPointsRemaining.addClass('rivalry-points-error');
                } else {
                    $rivalPointsRemaining.text('Available: ' + displayPts);
                    // The remaining points are 1-100, which is okay. Don't show an error, and don't so success.
                    $rivalryPointsTotal.removeClass(['valid-point-total', 'rivalry-points-error']);
                    $rivalPointsRemaining.removeClass(['valid-point-total', 'rivalry-points-error']);
                }
                

                return false;
            }
        }
    }


    // Code that runs on $NextButton click
    this.entRivalsNextButtonHandler = function(testingMode){
        console.log('Next button handler clicked. testingMode= '+testingMode);

        let rivalsListedEntIDs = []; // will be an array of rival entIDs

        $.when(
            // Iterate through all the cboRivals dropdown boxes
            $cboRivals.each(function () {
                const $this = $(this);

                // fnRivalKey returns "Rival01", "Rival02", etc., which is used to create the lookup term for $points.
                // Points boxes [and embedded data] are named "Rival01Points", "Rival02Points", etc.
                let strRivalKey = fnRivalKey($this);
                let $points = $('#'+strRivalKey+'Points');

                const cboSelection = $this.find('option:selected');

                // Set variables about the selected rival.
                // Most are pulled from the survey itself, but others use the entID to fetch information from KRDbEntData.json
                // (via the getEntData function in omnisurveyData.js).
                const entID = parseInt(cboSelection.val()),     // entID for the rival
                    name = cboSelection.text(),                 // Name of the rival
                    rivpoints = $points.val(),                  // Points allocated to the rival
                    nameThe = entID ? data.getEntData(entID)["entityNameThe"] : '';     // Rival's name with "the", if appropriate (from KRDbEntData.json)
                
                if (testingMode){
                    if (entID) {
                        rivalsListedEntIDs.push(entID);
                        console.log(
                            name + " (entID #" + entID + ") "
                            + "would have been stored to embedded data: "
                            + nameThe + " (" + rivpoints + " points)"
                            )
                    }
                } else {
                    const qse = Qualtrics.SurveyEngine;

                    return $.when(qse.setEmbeddedData(strRivalKey + 'EntID', entID))
                    .then(function (returnedContent) {
                        if (entID) {
                            rivalsListedEntIDs.push(entID);
                            qse.setEmbeddedData(strRivalKey + 'Name', name);
                            return qse.setEmbeddedData(strRivalKey + 'NameThe', nameThe);
                        }
                    })
                    .then(function (returnedContent){
                        return qse.setEmbeddedData(strRivalKey + 'Points', rivpoints);
                    })
                    .done(function (returnedContent){
                        return console.log("entID #" + entID + " stored to embedded data: " + name + " (" + rivpoints + " points)")
                    });
                }
            })
        )
        .then(function(returnedContent){
            // These are written to Qualtrics Embedded Data
            const
                intNumOfRivalsListed = rivalsListedEntIDs.length,
                intNumOfRivContainers = $cboRivals.length,
                intEntsInKRGrouping = data.entsInKRGrouping(groupingId),
                objNonRival = determineANonRival(entId, groupingId, rivalsListedEntIDs), // returns {entID: 1234, entityName:'A non rival team name', etc.}
                nonrivalEntID = objNonRival.entID,
                nonrivalName = objNonRival.entityName,
                nonrivalNameThe = objNonRival.entityNameThe;
            
            if (testingMode){
                console.log(
                    'intNumOfRivalsListed', intNumOfRivalsListed,
                    'intNumOfRivContainers', intNumOfRivContainers,
                    'intEntsInKRGrouping', intEntsInKRGrouping,
                    'nonrivalNameThe', nonrivalNameThe
                );
            } else {
                const qse = Qualtrics.SurveyEngine;
                // If there are 8 teams in the league, and the resp lists all 7 as rivals, we cannot put that respondent into the NonRival condition.
                // The intNumOfRivalsListed and intEntsInKRGrouping are used by the Survey Flow to prevent that from happening.
                qse.setEmbeddedData('intNumOfRivalsListed', intNumOfRivalsListed);
                qse.setEmbeddedData('intNumOfRivContainers', intNumOfRivContainers); // just for reference
                qse.setEmbeddedData('intEntsInKRGrouping', intEntsInKRGrouping);

                // This writes the NonRival to the embedded data, even for those who aren't in the NonRival condition
                qse.setEmbeddedData('NonRival01EntID', nonrivalEntID);
                qse.setEmbeddedData('NonRival01Name', nonrivalName);
                return qse.setEmbeddedData('NonRival01NameThe', nonrivalNameThe);
            }
        });
        
        return true;

    }

    // groups = the grouping object that has conf/div hierarchy
    function createGroupOptions(groups, $select, level) {
        // initialize level if needed
        level = typeof level !== 'undefined' ? level : 0;

        $.each(groups, function (index, childGroup) {
            // stop at ent level, skip groups that shouldn't be displayed
            if (!childGroup.subgroups || !childGroup.omnisurvShowSelRival) {
                return;
            }

            const disabled = false; //childGroup.subgroups && childGroup.subgroups[0] && childGroup.subgroups[0].subgroups,
            const selected = childGroup.entID == groupingId;


            // Each subsequent child level is indented slightly more
            let spacer = '';
            const intIndent = 2;
            for (let i = 0; i < level * intIndent; i++) {
                spacer += '&nbsp;';
            }

            let strOptionGroup = [
                '<option',
                (disabled ? ' disabled="disabled"' : ''),
                ' value="' + childGroup.entID + '"',
                (selected ? ' selected' : ''),
                '>' + spacer + childGroup.termKRQualtrics,
                '</option>'].join('');
            let $optGroup = $(strOptionGroup).appendTo($select);


            // Iterate on itself. Use the level argument to avoid infinite looping
            if (childGroup.subgroups) {
                createGroupOptions(childGroup.subgroups, $select, level + 1);
            }
        });
    }

    function shuffleElements($selector) {
        let array = $selector.children();
        array = shuffleArray(array);
        let strToReturn='';
        $.each(array, (idx,$elem) => strToReturn += $elem.outerHTML );
        return strToReturn;
    }
    function shuffleArray(array){
        for (let iCount = array.length - 1; iCount > 0; iCount--) {
            const jCount = Math.floor(Math.random() * (iCount + 1));
            [array[iCount], array[jCount]] = [array[jCount], array[iCount]];
        };
        return array;
    }


    const determineANonRival = function(favteamEntId, groupingId, ineligibleEntIDs){        
        // Create array of ALL entIDs that are in the top grouping
        const currentGrouping = data.getEntsByGroup(groupingId);
        let currentEntIDs = Object.keys(currentGrouping).map((key) => currentGrouping[key]['entID']);
        
        // Create array of entities who can NOT be a NonRival here (rivals already listed, the Favorite Entity, etc.)
        ineligibleEntIDs.push(favteamEntId);

        // Remove ineligible entities from the array of all entIDs in the top grouping        
        currentEntIDs = currentEntIDs.filter((elem) => !ineligibleEntIDs.includes(elem));
        
        // Randomly select one of the remaining entIDs
        const intNonRivalEntID = shuffleArray(currentEntIDs).pop();
        
        // Return an object with the nonrival's info
        return data.getEntData(intNonRivalEntID);
    }

    function createRivalContainers(groupingId){
        // The HTML in Qualtrics only has a container for Rival01. This code uses that HTML as a template to create the rest of the containers.
        // The number of containers depends on number of teams that could potentially be a rival, below a certain maximum.
        // E.g., the typical maximum number someone can choose might be 10 rivals, but a fan of smaller leagues (e.g., IPL) can only choose 7 rivals (8 IPL teams - 1 for the FavEnt).
        const maxNumOfRivalSlots = 10;
        const totalNumOfRivContainers = Math.min(data.entsInKRGrouping(groupingId)-1, maxNumOfRivalSlots );

        const templateRivalKey = "Rival01";
        let $curContainer = $('#' + templateRivalKey + 'Container');
        const strTemplateHTML =  $('#' + templateRivalKey + 'Container')[0].outerHTML;
        for (let rivNum=2; rivNum <= totalNumOfRivContainers; rivNum++) { // Run for every rivalry container we need to build
            const numTwoDigit = (rivNum) =>("0" + rivNum).slice(-2); // change 2 to 02, 3 to 03, etc.
            const strNewRivalKey = "Rival"+numTwoDigit(rivNum);
            const strCurRivalKey = "Rival"+numTwoDigit(rivNum-1);
            let newHTML = strTemplateHTML.replace(new RegExp( templateRivalKey, "g"),strNewRivalKey); // Replace Rival01 with Rival02, Rival02 with Rival03, etc.
            newHTML = newHTML.replace(/\#1/,'#'+rivNum); // Replace '#1' with '#2', '#3', etc.
            $curContainer = $('#' + strCurRivalKey + 'Container'); // Change the focal container to be the most recent one created.
            $(newHTML).insertAfter($curContainer);
        };

        // Enable the dropdown boxes for Rival01. They're disabled by default so the page is able to create the other boxes correctly.
        $('#Rival01Container').find('.riv-selectors').find('select').removeAttr('disabled');
        $('#Rival01Container').find('.ent-select').addClass('is-enabled');

        return totalNumOfRivContainers;
    }


    // // TESTING code for when the user changes an ent name
    // $this.on('change', function () {
    //     const $selected = $(this).find('option:selected');
    //     console.log(rivalKey + 'Name: ' + $selected.text() + ' (' + + $(this).val() + ')');
    // });
    // // User changes the rivalry point assignment
    // $points.on('input change', function () {
    //     console.log(rivalKey + 'Points: ' + $(this).val());
    // });

    function init() {
        if (survIsInTestMode){console.log("EntityRivals.js running in test mode.")};
        let groups = null;

        // Randomize the order of examples in the instructions. Try not to influence how many rivals to list.
        let $sampleRivalPointDistributions = $('#rivPointSampleDistributions');
        $sampleRivalPointDistributions.html(shuffleElements($sampleRivalPointDistributions));

        if (groupingId > 0) {
            // get the grouping grouping
            groups = data.getGroupAndSiblings(groupingId);//data.getCompetitiveGroupingByEntId(entId);
        } else {
            // TODO: INVALID DATA, DO SOMETHING
            return;
        }
       
        // Create the HTML code for the rest of the rivalry rows
        $.when(createRivalContainers(groupingId))
        .then(function(){

            $rivalPointsInputs = $question.find(strRivalPointsBoxSelector);
            $rivalryPointsTotal = $('.pts-allocated');
            $rivalPointsRemaining = $(".pts-remaining");
            $cboRivals = $('select[id^=cboRival]'); // Select all dropdown with cboRival in their name (cboRival01, cboRival02, etc.)

            // populate ents on grouping change
            $question.on('change', 'select.grouping-select', function () {
                changeGrouping($(this));
                });

            // determine if there are sibling groupings to choose rivals from
            if (groups != null) {
                let $select = $('.grouping-select');
                createGroupOptions(groups, $select);
                $select.change(); // trigger change
            } else {
                $question.find(strEntDropdownSelector).each(function () {
                    populateEnts($(this), groupingId);
                });
            }

            // Have the points box number change when the user moves the slider
            const $range = $('.riv-points-slider');
            $range.on('input change', function () {
                let $this = $(this);
                // Select the correct points box for this rival by taking the current id (e.g., Rival02PointsSlider) and returning Rival02Points
                const pointsBox = $this.attr('id').replace('PointsSlider', 'Points');
                // Set the points box to be the number of rivalry points
                $('#' + pointsBox).val($this.val());
                validate();
            });

            // Have the slider change if the user enters a number in the points box
            $rivalPointsInputs.on('input change', function () {
                    let $this = $(this);
                    const pointsSlider = $this.attr('id').replace('Points', 'PointsSlider');
                    $('#' + pointsSlider).val($this.val());
                    validate();
                });

            // Whenever the Qualtrics question changes,
            // find all the SELECT elements (dropdowns) that that have 'ent-select' as a class.
            $question.on('change', strEntDropdownSelector, function() {
                selectEnt($(this));
            });

        });

    }

    // The first thing to do is create the rest of the HTML.
    // After that, I can run the init() like normal.
    init();
};

/*
    // The survey is built with so many separate Blocks that the user isn't able to go backwards.
    // But, in case that changes in the future, this code might be helpful.
    // Just be careful because it was causing a double-loading of the rivalry containers before getting cut altogether
    this.repopulateDropdowns = function(){
        const qse = Qualtrics.SurveyEngine;
        $cboRivals.each(function () {
            const $this = $(this);
            const $points = $this.closest('.rival-container').find('input.riv-points-box');    
            const rivalKey = fnRivalKey($this);
            $.when(qse.getEmbeddedData(rivalKey + 'EntID')).then( (returnedData) => $this.val(returnedData) );
            $.when(qse.getEmbeddedData(rivalKey + 'Points')).then( (returnedData) => $this.val(returnedData) );
        });    
    }
*/
