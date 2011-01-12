$(function(){
    Backbone.Collection = Backbone.Collection.extend({
        // Get an object from the collection using an arbitrary key value pair.
        contains: function(key, value){
            var index = this.pluck(key).indexOf(value);
            return (index > -1) ? this.at(index) : null;
        }
    });
    
    var Option = Backbone.Model.extend({
        defaults: {
            'name': 'An option',
            'value': 'A value'
        },
        initialize: function(spec){
            this.validators = spec.validators || {};
        },
        validate: function(attrs){
            for(name in attrs){
                if(this.validators[name]){
                    this.validators[name].apply(this, attrs[name]);
                }
            }
        }
    });

    var OptionList = Backbone.Collection.extend({
        model: Option,
        localStorage: new Store('sad-options')
    });

    var Inbox = Backbone.Model.extend({
        defaults: {
            'count': 0,
            'lastUpdate': new Date(),
            'url': 'https://mail.google.com/mail/feed/atom'
        },
        localStorage: new Store('sad-inbox')
    });

    // Handles setting up the options list.
    var getOptionsList = function(){
        var defaultOptions = {
            'customDomain': '',
            'newMessageSound': 'http://media.freesound.org/data/19/previews/19446__totya__yeah_preview.mp3',
            'noMessagesSound': 'http://media.freesound.org/data/73/previews/73581__Benboncan__Sad_Trombone_preview.mp3'
        };

        var options = new OptionList;
        options.fetch();
        console.log('Options');
        
        if(options.length < 1){
            // Create default option models.
            for(name in defaultOptions){
                var opt = new Option({'name': name, 'value': defaultOptions[name]})
                options.add(opt);
                opt.save();
            }

        }
        console.log(options);
        return options;
    }

    // Used by background.html to monitor updates.
    var SadInbox = Backbone.Controller.extend({
        initialize: function(){
            _.bindAll(this, '_onTabSelectionChanged', '_giveFeedback');
            this._options = getOptionsList();
            
            this._inbox = new Inbox;
            this._inbox.fetch();
            this._fetchInboxUpdates();
            chrome.tabs.onSelectionChanged.addListener(this._onTabSelectionChanged);
        },
        _fetchInboxUpdates: function(){
            console.log('Fetching updates.');
            var _inbox = this._inbox;
            var _app = this;
            
            $.ajax({'url': this._inbox.get('url'), 
                'success': function(data){
                    var newCount = parseInt($(data).find('fullcount').text());                    
                    _app._giveFeedback((newCount > _inbox.get('count') ? 'newMessageSound' : 'noMessagesSound'));
                    _inbox.set({'count': newCount, 'lastUpdate': new Date()});
                    _inbox.save();
                }, 
                'error': function(error){
                    console.error(error);
                }
            });
        },
        _onTabSelectionChanged: function(tabId, changeInfo, tab){
            console.log('Tab selection changed.');
            _.bindAll(this, '_onTabGet');
            console.log('Going to get the tab');
            chrome.tabs.get(tabId, this._onTabGet);
        },
        _onTabGet: function(tab){
            console.log('onGetTab');
            console.log(tab);
            console.log(tab.url);
            if(tab.url && tab.url.indexOf('mail.google.com') > -1){
                console.log('Page is gmailish.  Going to fetch updates');
                this._fetchInboxUpdates();
            }
            else{
                console.log('Not a gmail url.  No-op.');
            }
        },
        _giveFeedback: function(goodOrBad){
            console.log('Giving feedback.' + goodOrBad);
            this._playSound(this._options.contains('name', goodOrBad).get('value'));
        },
        _playSound: function(url){
            console.log('Playsound '+url);
            new Audio(url).play();
        }
    });
    window.SadInbox = SadInbox;

    var SadInboxOptions = Backbone.Controller.extend({
        initialize: function(){
            this._options = getOptionsList();
        }
    });
});

