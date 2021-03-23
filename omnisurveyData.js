
// When this gets called, Danny passes the jQuery object as an argument.
// The $ in the parameter here is just a parameter like any other -- nothing special.
// It becomes jQuery when used anywhere in this space.
var Omnisurvey_Data = function ($) {
    var self = this;
    // These are the objects from data outputted by Access (RivDB_BuildSurvey)
    // I don't know/remember why GroupingHierarchy is an array and the others are objects - might be an error, although there's prob a reason
    let GroupingHierarchy = [], tbljsGroupings = {}, tbljsSurveys = {}, jsEntData = {};

    // Putting this.<whatever> allows us to expose the <whatever> to code elsewhere, like in LeagueSelection.js
    this.Surveys = {};
    this.Groupings = {};
    this.KRDbEntData = {};

    this.dataLoaded = false;

    // I added this just to define the paths up front and switch between local an GitHub. Just comment out what you're not using.
    let pathBase = ""; // local
    pathBase = "https://knowrivalry.github.io/omnisurvey/";
    // pathBase = "https://auxiliarydev.github.io/know-rivalry-omnisurvey/";
    // pathBase = "https://b-d-t.github.io/know-rivalry-omnisurvey/";
    const pathJSON = {
        "GroupingHierarchy": pathBase + 'data/groupingHierarchy.json',
        "Groupings": pathBase + 'data/groupings.json', // tbljsGroupings
        "Surveys": pathBase + 'data/surveys.json', // tbljsSurveys
        "KRDbEntData": pathBase + 'data/KRDbEntData.json' //jsEntData
    };

    // This is called from the end of init()
    // It creates a map from the JSON input
    function mapGroupings() {
        return Object.keys(tbljsGroupings).map(function (key) {
            return tbljsGroupings[key];
        });
    }
    function mapSurveys() {
        return Object.keys(tbljsSurveys).map(function (key) {
            return tbljsSurveys[key];
        });
    }
    function mapKRDbEntData() {
        return Object.keys(jsEntData).map(function (key) {
            return jsEntData[key]['Omnidata'];
        });
    }

    // Returns an object with the data for just one grouping. grpID is the same number as entID
    // e.g., (as of 20201111) if passed groupingId=1364, it returns {"grpID":1364,"grpSport":"Basketball","termKRQualtrics":"NBA",etc. 
    this.getGrouping = function (groupingId) {
        const groupings = self.Groupings.filter(function (grouping) {
            return grouping.grpID == groupingId;
        });

        // If the filter returns more than one grouping, just return the first one (MLB)
        if (groupings.length > 0) {
            return groupings[0];
        }

        return null;
    };

    // This uses the surveyId to pull all the groupings that are using that version of the survey
    this.getGroupingsBySurvey = function (surveyId) {
        const groupings = self.Groupings.filter(function (grouping) {
            return grouping.grpCurrentSurvID == surveyId;
        });

        if (groupings.length > 0) {
            return groupings;
        }

        return null;
    };

    // Returns an object with the data for just one survey
    // e.g., (as of 20201028) if pass surveyId=2, it returns {"survID":2,"survLaunchDate":0,"survInfConsTLDR":"InformedConsent_Sport_TLDR","survInfConsFullText":"InformedConsent_Sport_FullText","BLOCKIntro":false,"BLOCKInformedConsent":false,"BLOCKFavEnt":false,"BLOCKFavEntIden":false,"BLOCKRivalEnt":false}
    this.getSurvey = function (surveyId) {

        const surveys = self.Surveys.filter(function (survey) {
            return survey.survID == surveyId;
        });

        if (surveys.length > 0) {
            return surveys[0];
        }

        return null;
    };

    this.getEntData = function (entId) {
        let entities = self.KRDbEntData.filter(function (ent) {
            return ent.entID == entId;
        });
        
        // If the filter returns more than one entity's data, just return the first one
        if (entities.length > 0) {
            return entities[0];
        }

        return null;
    };
    
    this.entsInKRGrouping = (groupingId) => self.KRDbEntData.filter((obj) => obj.TopGroupingID == groupingId).length;

    // This is passed a groupingId
    this.getGroupById = function (groupId) {
        // Filter the Grouping Hierarchy JSON to find the children of this Id
        let group = self.filterGroups(GroupingHierarchy, 'entID', groupId);

        if (group.length > 0) {
            return group[0];
        }
        return null;
    };

    this.getEntsByGroup = function (groupId, sort) {

        var groups = getLowestLevelGroups(self.getGroupById(groupId).subgroups);

        if (groups === null || groups.length <= 0) {
            return null;
        }

        if (typeof sort !== 'undefined' && sort !== '') {
            if (sort === 'termKRQualtrics') {
                groups.sort(sortName);
            }
        }

        return groups;
    };

    function sortName(a, b) {
        if (a.termKRQualtrics < b.termKRQualtrics) { return -1; }
        if (a.termKRQualtrics > b.termKRQualtrics) { return 1; }
        return 0;
    }

    function getLowestLevelGroups(groups, acc) {
        // initialize acc if needed
        acc = typeof acc !== 'undefined' ? acc : [];

        return groups.reduce(function (acc, group) {
            return group.subgroups ? getLowestLevelGroups(group.subgroups, acc) : acc.concat(group);
        }, acc);
    };


    // Recursive function to filter Grouping Hierarchy
    // It starts at the top of the JSON and goes down until it finds the league (e.g., finds 1364 for the NBA).
    // It returns all the NBA's children as defined by the JSON file.
    this.filterGroups = function (groups, key, value, results) {
        // initialize results if needed
        results = typeof results !== 'undefined' ? results : [];

        // The first item in the JSON is an array, as is the first item within any sub-grouping.
        if (Array.isArray(groups)) {
            // groups is an array, iterate and filter
            groups.forEach(function (childGroup) {
                results = self.filterGroups(childGroup, key, value, results);
            });
        } else {
            // groups is an object, see if it's what we're looking for
            if (groups[key] == value) {
                results.push(groups); // found a match
            }

            // filter child groups if there are any
            if (groups.subgroups) {
                results = self.filterGroups(groups.subgroups, key, value, results);
            }
        }

        return results;
    };


    // ############# Added for ent Rival Selection #######################

    this.getGroupAndSiblings = function(groupId) {
        const parentGroup = getParentGroup(groupId, GroupingHierarchy);
    
        if (parentGroup.length > 0) {
          // remove the group with the id we are looking for so we only return siblings
          // E.g., if we choose NFL in the parent 'League' dropdown,
          // we can remove the NFL as a choice from the 'Team' dropdown and start with Arizona, Atlanta, Baltimore,...
          // Similarly, if we select "AFC", it will start with "Baltimore, Buffalo, ..." and not show AFC.
          return parentGroup[0].subgroups;
        }
    
        return parentGroup;
      }

      function getParentGroup(groupId, groups, acc) {
        // initialize accumulator (acc) if needed
        acc = typeof acc !== 'undefined' ? acc : [];
    
        return groups.reduce(function(acc, group) {
          var match = group.subgroups && group.subgroups.some(function(g) {
            return g.entID == groupId && g.subgroups;
          });
    
          return match ? acc.concat(group) : (group.subgroups? getParentGroup(groupId, group.subgroups, acc) : acc);
        }, acc);
      }
    


    function init() {
        // dataLoaded starts as true. It only becomes false is there's a failure on one of the fetches 
        let dataLoaded = true;

        // This creates the event that is initiated below and then dispatched at the end of the init function
        let loadedEvent = document.createEvent('Event');

        loadedEvent.initEvent('OmnisurveyReady', true, true);

        let aryJSONLoaded = []; // this is just to help with testing. This variable (and its inclusions below) can be deleted if you want.
        const fnErrorLoadingJSON = (jsonDataName, textStatus) => { dataLoaded = false; console.log("Error loading " + jsonDataName + " JSON data: " + textStatus) };
        $.when(
            $.getJSON(pathJSON.GroupingHierarchy)
                .done(function (data) {
                    // Store the cascading object of the entire hierarchy,
                    // starting with root, then sport (entID:2, sport:"Gridiron football"), and ending with a ent (e.g., entID:165, termKRQualtrics:"Chicago Bears")

                    // A note on using omnisurvShowSelRival
                    // // Typically, this will be false until we reach the league we want. E.g., "Men's basketball (5 on 5)" and above is FALSE, but "NBA" is TRUE.
                    // // If "omnisurvShowSelRival": false, that entry will NOT appear in the filters.
                    // // However, the terms UNDER that entry still appear in the parent filter.
                    // // For example, in the follow data structure, the dropdown will show "NBA>Eastern>[Atlantic, Southeast]" (i.e., Central is missing).
                    // // But, selecting "Eastern" still allows you to see the Bulls and Cavs as choices.
                    // //
                    // // NBA:{"omnisurvShowSelRival": true}
                    // // // Eastern: {"omnisurvShowSelRival": true}
                    // // // // Atlantic:  {"omnisurvShowSelRival": true}  Celtics, Nets as choices
                    // // // // Central:   {"omnisurvShowSelRival": false} Bulls, Cavs as choices
                    // // // // Southeast: {"omnisurvShowSelRival": true}  Hawks, Hornets as choices

                    // Replace the "cur_subentity_is" statements from Cypher output with "subgroups", which is what the JavaScript code uses.
                    // do some something with data
                    function changeKeyName(json, oldKeyName, newKeyName){
                        const strJSONOrig = JSON.stringify(json);
                        const strJSONNew = strJSONOrig.replace(new RegExp(oldKeyName, "g"), newKeyName);
                        return JSON.parse(strJSONNew);
                    }
                    const jsonGroupingHierarchy = changeKeyName(data,"cur_subentity_is", "subgroups");

                    // The output from Cypher isn't sorted quite right.
                    // Within each league, the 0 levels come before 1 levels, 1 levels before 2 level, etc.
                    // So, for NCAA sports, Big 12 (1 level) comes before the ACC (2 levels).
            // Do I need to fix that here by sorting the JSON?? 
                    // Sort the JSON based on league, qtrxDispOrderInGrp, then termKRQualtrics
                    GroupingHierarchy = jsonGroupingHierarchy; aryJSONLoaded.push("Grouping Hierarchy");
                }).fail(function (jqXHR, textStatus, errorThrown) { fnErrorLoadingJSON("grouping hierarchy", textStatus); }),

            $.getJSON(pathJSON.Groupings)
                .done(function (data) {
                    // Store the groupings object. {grpID:7, grpSport:"Cricket", termKRQualtrics:"BBL", etc.}
                    tbljsGroupings = data; aryJSONLoaded.push("Groupings");
                    self.Groupings = mapGroupings();
                }).fail(function (jqXHR, textStatus, errorThrown) { fnErrorLoadingJSON("grouping", textStatus); }),

            $.getJSON(pathJSON.Surveys)
                .done(function (data) {
                    // Store the Surveys object {survID:1, BLOCKFavEnt:true}
                    tbljsSurveys = data; aryJSONLoaded.push("Survey JSON loaded");
                    self.Surveys = mapSurveys();
                }).fail(function (jqXHR, textStatus, errorThrown) { fnErrorLoadingJSON("survey", textStatus); }),
        
            $.getJSON(pathJSON.KRDbEntData)
                .done(function (data) {
                    // Store the KRDbEntData object {entID:1, {termKRQualtrics:"Boston Celtics"}}
                    jsEntData = data; aryJSONLoaded.push("KRDbEntData JSON loaded");
                    self.KRDbEntData = mapKRDbEntData();
                }).fail(function (jqXHR, textStatus, errorThrown) { fnErrorLoadingJSON("KRDbEntData", textStatus); })
        )
            .then(function () {

                self.dataLoaded = dataLoaded;

                // At each step while loading the JSONs, if it failed, there was a line to assign dataLoaded=false
                if (dataLoaded) {
                    console.log("JSON loaded: ", aryJSONLoaded.join(", "));

                    // This kicks the code back to the script in LeagueSelection. immediately. 
                    document.dispatchEvent(loadedEvent);
                } else {
                    console.log('The dataLoaded variable was false, which means there was an error loading the data.');
                }
            })
            .done(function(){
                return dataLoaded;
            });
    }

    init();

};