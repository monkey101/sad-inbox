$(function(){
    Backbone.Collection = Backbone.Collection.extend({
        // Get an object from the collection using an arbitrary key value pair.
        contains: function(key, value){
            var index = this.pluck(key).indexOf(value);
            return (index > -1) ? this.at(index) : null;
        }
    });
    
    // Pretty much every model view has been EXACTLY the same except for the 
    // template and tage names used.  Just a little wrapper so you only have 
    // to define those.
    Backbone.ModelView = Backbone.View.extend({
        initialize: function(opts){
            _.bindAll(this, 'render');
            this.model.bind('change', this.render);
            this.model.view = this;
        },
        render: function() {
            $(this.el).html(this.template(this.model.toJSON()));
            return this;
        },
        remove: function() {
            $(this.el).remove();
        }
    });
    
    
    var Options = Backbone.Model.extend({
        defaults: {
            'customDomain': '',
            'newMessageSound': 'http://media.freesound.org/data/19/previews/19446__totya__yeah_preview.mp3',
            'noMessagesSound': 'http://media.freesound.org/data/73/previews/73581__Benboncan__Sad_Trombone_preview.mp3'
        },
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
    var getOptions = function(){
        var options = new Options;
        options.fetch();
        return options;
    }

    // Used by background.html to monitor updates.
    var SadInbox = Backbone.Controller.extend({
        initialize: function(){
            _.bindAll(this, '_onTabSelectionChanged', '_giveFeedback');
            this._options = getOptions();
            
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
            this._playSound(this._options.get(goodOrBad));
        },
        _playSound: function(url){
            console.log('Playsound '+url);
            new Audio(url).play();
        }
    });
    window.SadInbox = SadInbox;
    
    var OptionsView = Backbone.ModelView.extend({
        el: $('#sad-inbox-options'),
        events: {
          "submit #options-form":  "saveOptions",
        },
        saveOptions: function(){
            this.model.save();
            return false;
        },
        render: function(){
            this.template = _.template($('#options-template').html());
            $(this.el).html(this.template(this.model.toJSON()));
            return this;
        }
    });
    
    var SadInboxOptions = Backbone.Controller.extend({
        initialize: function(){
            this._options = getOptions();
            this._view = new OptionsView({model: this._options});
            this._view.render();
        }
    });
    window.SadInboxOptions = SadInboxOptions;
});

