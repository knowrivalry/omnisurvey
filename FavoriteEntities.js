'use strict';

var Omnisurvey_FavoriteEnts = function ($, data, groupingId) {

	const self = this;

	// Eventually, these are what will be passed to the Qualtrics embedded data
	this.favoriteEntSelectedHandler; // defined in the HTML
	this.FavoriteEntId = -1;
	this.FavoriteEntName = "";
	this.FavoriteEntNameThe = "";
	this.termKRQtrxManipIdenLevelQual="";

	let selectedGrouping = null;
	let $groupingFilter = $('#groupingFilter');
	let $favEntBtns = null;
	let $ents = $('#ents');
	let $selectedEntLogo = $('#selected-ent-logo');
	let $selectedEntContainer = $('#selected-ent');

	const $entsContainer = $('#ents-container');
	const $nextButton = $("#NextButton");

	const strEntLogoRootDir = 'https://knowrivalry.com/images/entlogos/'; // This is the folder that holds the logos (SVGs) for each entity

	// groups = the grouping object that has conf/div hierarchy
	function createGroupOptions(groups, $select, level) {
		// initialize level if needed
		level = typeof level !== 'undefined' ? level : 0;

		$.each(groups, function (index, childGroup) {
			// stop at team level, skip groups that shouldn't be displayed
			if (!childGroup.subgroups || !childGroup.omnisurvShowSelRival) {
				return;
			}

			// Each subsequent child level is indented slightly more
			let spacer = '';
			const intIndent = 2;
			for (var i = 0; i < level * intIndent; i++) {
				spacer += '&nbsp;';
			}

			const disabled = false; //childGroup.subgroups && childGroup.subgroups[0] && childGroup.subgroups[0].subgroups,
			const selected = childGroup.entID == groupingId;

			const strOptionGroup = [
				'<option',
				(disabled ? ' disabled="disabled"' : ''),
				' value="' + childGroup.entID + '"',
				(selected ? ' selected' : ''),
				'>' + spacer + childGroup.termKRQualtrics,
				'</option>'].join('');
			const $optGroup = $(strOptionGroup).appendTo($select);

			// Iterate on itself. Use the level argument to avoid infinite looping
			if (childGroup.subgroups) {
				createGroupOptions(childGroup.subgroups, $select, level + 1);
			}
		});
	}

	function selectEnt(entId, entName) {
		const objEntData = data.getEntData(entId);
		// These values are written to Qualtrics embedded data
		self.FavoriteEntId = entId;
		self.FavoriteEntName = !objEntData ? "" : objEntData["entityName"]; // Boston Celtics
		self.FavoriteEntNameThe = !objEntData ? "" : objEntData["entityNameThe"]; // the Boston Celtics
		self.termKRQtrxManipIdenLevelQual = !objEntData ? "" : objEntData["TopGroupingNameThe"];  // the NBA

		if (entId > 0) {
			const ent = data.getGroupById(entId);
			const imgPath = strEntLogoRootDir + 'logo_ent'+ent.entID+'.svg';

			// set the logo and the ent name
			$selectedEntLogo.css('background-image', 'url(' + imgPath + ')');
			$selectedEntContainer.find('#selected-ent-name').html(self.FavoriteEntName);

			// enable next button
			nextBtn(true);

			$selectedEntContainer.show();
			$entsContainer.hide();

		} else {
			nextBtn(false);

			// hide/show containers
			$selectedEntContainer.hide();
			$entsContainer.show();
		}

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
		
		if (typeof self.favoriteEntSelectedHandler === 'function') {
			self.favoriteEntSelectedHandler();
		}
	}


	function showAllFavEntButtons(blnShowAll) {
		if (blnShowAll == true) {
			$favEntBtns.show();
		} else {
			$favEntBtns.hide();
		}
	}
	function createFavEntButtons() {
		const ents = data.getEntsByGroup(groupingId, 'termKRQualtrics');

		// Populate the ent selection logos and ent names
		ents.forEach(function (ent) {
			const strEntImgFilename = strEntLogoRootDir + 'logo_ent' + ent.entID + '.svg';
			$ents.append('<div style="background-image: url(' + strEntImgFilename + ')" id="btnEntID' + ent.entID + '" class="ClassFavEnt" data-entid="' + ent.entID + '">' + ent.termKRQualtrics + '</div>');
		});

		$favEntBtns = $('.ClassFavEnt');
		$favEntBtns.on('click', favEntClicked);
	}

	function favEntClicked() {
		var $this = $(this);

		// The entID must be lowercase because the 'data' attribute automatically lowercases everything
		selectEnt($this.data('entid'), $this.text());
	}


	// This is used as an argument in a function. I think 'this' refers to the caller,
	// and .val is the text of that element.
	function filterChanged() {
		const groupId = $(this).val();
		filterEnts(groupId);
	}

	function filterEnts(groupId) {
		if (groupId === undefined || groupId === '') {
			// show all
			showAllFavEntButtons(true);
		} else {
			// hide all
			showAllFavEntButtons(false);

			// show filtered ents
			const ents = data.getEntsByGroup(groupId);
			$.each(ents, function (index, ent) {
				//if (ent.divisionLevels[filterLevel-1] == filterValue) {
				$favEntBtns.filter('[data-entid=' + ent.entID + ']').show();
				//}
			});
		}
	}

	function resetAll() {
		selectEnt(-1, "");
	}
	

	function init() {
		// get an object of the grouping data
		selectedGrouping = data.getGroupById(groupingId);

		if (selectedGrouping === null) {
			// TODO: INVALID DATA, NOW WHAT?
			return;
		}

		createGroupOptions([selectedGrouping], $groupingFilter);
		$groupingFilter.on('change', filterChanged);


		// Create FavEnt buttons
		createFavEntButtons();

		resetAll();

		$('.faventResetAllFilters').on('click', function (e) {
			e.preventDefault();
			resetAll();
		});
	}

	init();
};
