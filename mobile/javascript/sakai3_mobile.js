$(function(){


    /////////////////////////////
    // Configuration variables //
    /////////////////////////////

    var $sakai3_body = $('body');

    var $login_fail = $("#login_fail");
    var $sakai3_signin = $("#sakai3_signin");
    var $sakai3_signin_button = $("#sakai3_signin_button");
    var $sakai3_signout = $('#sakai3_signout');
    var $sakai3_password = $("#sakai3_password");
    var $sakai3_username = $("#sakai3_username");

    var $sakai3_message = $("#sakai3_message");
    var $sakai3_message_template = $("#sakai3_message_template");
    var $sakai3_messages = $("#sakai3_messages");
    var $sakai3_messages_template = $("#sakai3_messages_template");

    var $sakai3_editprofile = $("#sakai3_editprofile");
    var $sakai3_profile = $("#sakai3_profile");
    var $sakai3_profile_template = $("#sakai3_profile_template");

    var $sakai3_chat = $("#sakai3_chat");
    var $sakai3_chat_template = $("#sakai3_chat_template");
    var $sakai3_chatroom_form = $("#sakai3_chatroom_form");
    var $sakai3_chatroom_log = $("#sakai3_chatroom_log");
    var $sakai3_chatroom_message = $("#sakai3_chatroom_message");

    var checkingMessages = false;
    var checkingOnline = false;
    var hideNotifications = true;
    var pulltime = "2100-10-10T10:10:10.000Z";

    var selectedChatContact;
    var selectedMessage;

    var chatlogs = [];
    var contacts = [];
    var messageArray = [];
    var onlineContacts = [];
    var time = [];


    //////////
    // Date //
    //////////

    /**
     * Add a zero in front of the number if it is lower than 10
     * @param {Integer} number Number to pad
     */
    function pad2(number){
        return (number < 10 ? '0' : '') + number;
    }

    /**
     * Return a formatted date string (MMM D, hh:mm) from the JSON date
     * @param {String} date JSON date
     */
    var setDate = function(date){
        var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        // Convert the JSON date into a Javascript Date object
        date = sakai.api.Util.parseSakaiDate(date);

        // Extract the desired information from the Date object
        // If the number is smaller than 10, a zero is added in front of it
        date_month = months[date.getMonth()];
        date_day = date.getDate();
        date_hours = pad2(date.getHours());
        date_minutes = pad2(date.getMinutes());

        // Return the date string in the format MMM D, hh:mm
        return date_month + " " + date_day + ", " + date_hours + ":" + date_minutes;
    };


    ////////////////
    // Array sort //
    ////////////////

    /**
     * Sort contacts by status, then by first name
     * @param {Object} a First contact to sort
     * @param {Object} b Second contact to sort
     */
    var sortColumns = function(a, b){

        // Status variables
        var sA = a.status;
        var sB = b.status;

        // First name variables
        var nA = a.profile.firstName;
        var nB = b.profile.firstName;

        // If the status is the same
        if (sA == sB) {

            // Sort by first name (ascending)
            return ((nA < nB) ? -1 : ((nA > nB) ? 1 : 0));
        } else {

            // Sort by status (descending, so online users stand above the offline ones)
            return ((sA > sB) ? -1 : ((sA < sB) ? 1 : 0));
        }
    };


    //////////
    // Chat //
    //////////

    /**
     * Loads the logged chat messages when the chatbox screen opens
     */
    var loadChatMessages = function(){

        // Display the log in the textarea
        $sakai3_chatroom_log.val(chatlogs[selectedChatContact]);

        // Scroll to bottom
        $sakai3_chatroom_log.attr({
            scrollTop: $sakai3_chatroom_log.attr("scrollHeight")
        });
    };

    /**
     * Add a chat message
     * @param {Object} message Message that needs to be added
     */
    var addChatMessage = function(contact, message){

        // If the chatlog doesn't exist, a new empty one is made to prevent errors later on
        if (! chatlogs[contact]){
            chatlogs[contact] = "";
        }

        // This variable holds the log from before the new message arrived
        var log = chatlogs[contact];

        // Add a newline in front of the new message when the log isn't empty
        if (log.length > 0){
            message = "\n" + message;
        }

        // Add the new message at the end of the log
        log = log + message;

        // Save log in the chatlogs array for the user who sent it
        chatlogs[contact] = log;

        // Only update the textarea if it is from the updated log is from the open conversation
        if (contact == selectedChatContact){
            loadChatMessages();
        }
    };

    /**
     * Update the chat window
     */
    var loadChatText = function(){

        // Send an Ajax request to get the chat messages
        // Include the name of the chat contact, the maximum number of items to fetch and the time since the last check
        $.ajax({
            url: sakai.config.URL.CHAT_GET_SERVICE.replace(/__KIND__/, "unread"),
            data: {
                "_from": onlineContacts.join(","),
                "items": 1000,
                "t": pulltime
            },
            cache: false,
            success: function(data){

                // Run through each new item
                for (var j = 0; j < data.results.length; j++){

                    // Place the sender and receiver in variables to make code cleaner
                    var from = data.results[j].userFrom[0].userid;
                    var to = data.results[j].userTo[0].userid;

                    // Change the name of the sender if it equals me
                    // Get the username of the other contact
                    if (from === sakai.data.me.user.userid){
                        from = from + " (me)";
                        contact = to;
                    } else {
                        contact = from;
                    }

                    // Add a timestamp
                    var timestamp = sakai.api.Util.parseSakaiDate(data.results[j]["sakai:created"]);
                    timestamp = pad2(timestamp.getHours()) + ":" + pad2(timestamp.getMinutes());

                    // Add the message to the log, with the timestamp and userid of the sender
                    addChatMessage(contact, "[" + timestamp + "] <" + from + "> " + data.results[j]["sakai:body"]);
                }
            },
            error: function(xhr, textStatus, thrownError){
                console.log("error");
            }
        });

    };

    /**
     * Send the new message
     * @param {Object} message Input to send
     */
    var sendMessage = function(message){

        // First get the up-to-date user data, so the userid of the sender equals the one of the logged in user
        sakai.api.User.loadMeData(function(success, response){

            // Fill in the data
            var data = {
                "sakai:type": "chat",
                "sakai:sendstate": "pending",
                "sakai:messagebox": "outbox",
                "sakai:to": "chat:" + selectedChatContact,
                "sakai:from": sakai.data.me.user.userid,
                "sakai:subject": "",
                "sakai:body": message,
                "sakai:category": "chat",
                "_charset_": "utf-8"
            };

            // Send the message
            // Only show console output when something went wrong
            $.ajax({
                url: "/_user" + sakai.data.me.profile.path + "/message.create.html",
                type: "POST",
                success: function(data){
                },
                error: function(xhr, textStatus, thrownError){
                    console.log("An error occured while sending the message.");
                },
                data: data
            });
        });
    };

    /**
     * Show and update the list of contacts
     * @param {Object} response All online and offline contacts of the logged in user
     */
    var showContacts = function(response){

        // Boolean to determine whether a change has happened compared to the previous fetch
        // This is to only render the template when needed
        changeOccured = false;

        // Reset the online contacts array
        onlineContacts = [];

        // Run through every contact
        for (var j = 0, l = response.contacts.length; j < l; j++){

            // Make the status accessible by TrimPath
            response.contacts[j].status = response.contacts[j]["sakai:status"];

            // Compare the status with the one stored in the array
            // If it differs, the user either joined or left
            if(contacts[response.contacts[j].user] != response.contacts[j].status){

                // Update the array of statuses
                contacts[response.contacts[j].user] = response.contacts[j].status;

                // To update the HTML a render will be required
                changeOccured = true;

                // Display a notification if a user logged in
                // Also add the username in the notification class, it is required to
                // determine what user it represents when the notification is clicked
                if (response.contacts[j].status == "online" && !hideNotifications){
                    $("#notification_container").removeClass().addClass(response.contacts[j].user);
                    $("#notification_container").html(response.contacts[j].user + " has logged in.");
                    $("#notification_container").show().fadeOut(5000);
                }
            }

            // Add every online contact in the array
            if (response.contacts[j].status == "online"){
                onlineContacts.push(response.contacts[j].user);
            }
        }

        // If a user joined or left
        if (changeOccured){

            // Order the contacts by status, then by first name
            response.contacts.sort(sortColumns);

            // Assemble message array
            allContacts = {
                all: response.contacts,
                loaded: true
            };

            // Remove any previous lists
            $(".chat_list").remove();

            // Render the template
            $sakai3_chat.after($.TemplateRenderer($sakai3_chat_template, allContacts));

            // Bind the message list items
            $('.chat_li').unbind('click').bind('click', function(e, data){

                // Equal the global selectedChatContact variable with the ID of the clicked list item (= contact.user)
                selectedChatContact = e.currentTarget.id;
            });

            // No longer hide notifications (if they still were being hidden)
            hideNotifications = false;
        }
    };

    /**
     * Check if there are any new chat messages for any of the contacts
     * A response could look like this:
     * {
     *    update: true,
     *    time: 1255947464940
     * }
     * The update variable will be true
     * This functon is executed every 3 seconds
     */
    var checkNewMessages = function(){

        // Create a data object
        var data = {};

        // Check if the time is not 0, if so set the current time
        if (time.length !== 0) {
            data.t = time;
        }

        // Get the active user details, otherwise the Ajax call won't work on the iPod
        sakai.api.User.loadMeData(function(success, response){

            // Send an Ajax request to check if there are new messages
            $.ajax({
                url: "/_user" + sakai.data.me.profile.path + "/message.chatupdate.json",
                data: data,
                success: function(data){

                    // Get the time
                    time = data.time;
                    pulltime = data.pulltime;

                    // Get the message updates if the update variable is true
                    if (data.update) {
                        loadChatText();
                    }

                    // Execute this function again in 3 seconds
                    setTimeout(checkNewMessages, 3000);
                },
                error: function(){
                    
                    // The user has signed off
                    // This function will be enabled again from the moment the user signs in, and is redirected to the My Sakai page
                    checkingMessages = false;
                }
            });
        });
    };

    /**
     * This function is executed when the send message form is submitted
     */
    var performChatSubmit = function(){

        // Check if there is input
        if ($.trim($sakai3_chatroom_message.val()).length > 0){

            // Send the message
            sendMessage($.trim($sakai3_chatroom_message.val()));

            // Empty input field
            $sakai3_chatroom_message.val("");
        }
    };

    /**
     * Set the presence for the current user
     * This lets the server know the user is still available for chatting
     * This function is executed every 20 seconds
     */
    var setPresence = function(){
        var data = {
            "sakai:status": "online",
            "_charset_": "utf-8"
        };
        $.ajax({
            url: sakai.config.URL.PRESENCE_SERVICE,
            type: "POST",
            success: function(){
                setTimeout(setPresence, 20000);
            },
            data: data
        });
    };

    /**
     * Get every contact
     * This function is executed every 5 seconds
     */
    var getPresence = function(){

        // Receive all contacts through an Ajax request
        $.ajax({
            url: sakai.config.URL.PRESENCE_CONTACTS_SERVICE,
            cache: false,
            success: function(data){
                showContacts(data);
                setTimeout(getPresence, 5000);
                goBackToLogin = true;
            },
            error: function(){
                
                // The user is no longer active, destroy the session and go to the sign in page
                console.log("getPresence error");
                performSignOut();
            }
        });
    };


    ////////////////
    // User Image //
    ////////////////

    /**
     * Check whether there is a valid picture for the user
     * @param {Object} profile The profile object that could contain the profile picture
     * @return {String}
     * The complete URL of the profile picture
     * Will be an empty string if there is no picture
     */
    var constructProfilePicture = function(profile){
        if (profile.picture && profile.path){
            return "/_user" + profile.path + "/public/profile/" + $.parseJSON(profile.picture).name;
        } else {
            return "/dev/_images/person_icon.jpg";
        }
    };

    /**
     * Show the user image
     * @param {String} username The name of the user to show the image from
     */
    var getUserImage = function(username){
        var returnvalue;

        // Get profile data from user
        $.ajax({
            data:{
                "username": username
            },
            url: sakai.config.URL.SEARCH_USERS,
            success: function(data){

                // Return the location of the image
                returnvalue = constructProfilePicture(data.results[0]);
            },
            error: function(){
                console.log("getUserImage: Could not find the user");
            },
            complete: function(data){
                showRecentMessage(true, returnvalue);
            }
        });
    };


    /////////////////////
    // Recent Messages //
    /////////////////////

    /**
     * Show the recent messages
     * @param {Boolean} callback JSON response
     * @param {String} image Path to image
     */
    var showRecentMessage = function(callback, image){

        // Check if callback from getUserImage
        if (!callback) {

            // Get path to image
            // This function will sent the result to this function, with the callback parameter set to true
            getUserImage(messageArray.messages[selectedMessage].from);
        } else {

            // Assemble message array
            message = {
                all: messageArray.messages[selectedMessage],
                image: image
            };

            // Render the template
            $sakai3_message.html($.TemplateRenderer($sakai3_message_template, message));
        }
    };

    /**
     * Render the messages from the JSON response data
     * @param {Object} response JSON response
     */
    var renderRecentMessages = function(response){

        if (response) {

            // Create result objects based on response JSON data
            for (var j = 0, l = response.results.length; j < l; j++){
                response.results[j].nr = j;
                response.results[j].body = (response.results[j]["sakai:body"]).replace(/\n/g,"<br/>");
                response.results[j].created = setDate(response.results[j]["sakai:created"]);
                response.results[j].from = response.results[j]["sakai:from"];
                response.results[j].from_firstname = response.results[j].userFrom[0].firstName;
                response.results[j].from_lastname = response.results[j].userFrom[0].lastName;
                response.results[j].subject = response.results[j]["sakai:subject"];
            }

            // Put messages in array
            messageArray = {
                messages: response.results
            };

            // Remove any previous lists
            $(".messages_list").remove();

            if (messageArray.messages.length > 0){

                // Render template
                $sakai3_messages.after($.TemplateRenderer($sakai3_messages_template, messageArray));
            } else {

                // Show message
                $sakai3_messages.after("<ul class='rounded messages_list'><li>There are no messages to show.</li></ul>");
            }

            // Bind the message list items
            $('.message_li').unbind('click').bind('click', function(e, data){

                // Equal the global selectedMessage variable with the ID of the clicked list item (= message.nr)
                selectedMessage = e.currentTarget.id;
            });
        }
    };

    /**
     * Load the recent messages for the current user
     * @param {Object|Boolean} response
     * The response that the server has send.
     * If the response is false, it means we were not able to connect to the server
     */
    var loadRecentMessages = function(response){

        // Render the recent messages for the current user.
        renderRecentMessages(response);
    };

    /**
     * Send a request to the message service.to get your recent messages
     */
    var getRecentMessages = function(){

        // Set a params object to set which params should be passed into the request
        var params = $.param({
            box: "inbox",
            category: "message",
            sortOn: "sakai:created",
            sortOrder: "descending"
        });

        // Fire an Ajax request to get the recent messages for the current user
        $.ajax({
            url: sakai.config.URL.MESSAGE_BOXCATEGORY_SERVICE + "?" + params,
            cache: false,
            success: function(data){
                loadRecentMessages(data);
            },
            error: function(){
                loadRecentMessages(false);
            }
        });
    };


    /////////////
    // Profile //
    /////////////

    /**
     * Save the values from the input fields
     */
    var performProfileSave = function(){
        var tosend = {};
        tosend["firstName"] = $("#sakai3_profile_firstname").val();
        tosend["lastName"] = $("#sakai3_profile_lastname").val();
        tosend["email"] = $("#sakai3_profile_email").val();
        tosend["_charset_"] = "utf-8";

        $.ajax({
            url: sakai.data.me.profile["jcr:path"],
            type: "POST",
            data: tosend,
            error: function(xhr, textStatus, thrownError){
                fluid.log("performProfileSave: An error has occured while posting to " + sakai.data.me.profile["jcr:path"]);
            },
            complete: function(data){
                jQt.goBack();
            }
        });
    };

    /**
     * Get the values which can be edited, and place them in the input fields
     */
    var getEditProfile = function(){
        sakai.api.User.loadMeData(function(success, data){
            $("#sakai3_profile_firstname").val(data.profile.firstName);
            $("#sakai3_profile_lastname").val(data.profile.lastName);
            $("#sakai3_profile_email").val(data.profile.email);
        });
    };

    /**
     * Get all information from the profile and render the trimpath template
     */
    var getProfile = function(){
        sakai.api.User.loadMeData(function(success, data){
            var profile = data.profile;
            profile.aboutme = $.parseJSON(data.profile.aboutme);
            profile.basic = $.parseJSON(data.profile.basic);
            profile.contactinfo = $.parseJSON(data.profile.contactinfo);
            profile.picture = constructProfilePicture(profile);

            // If no data is abailable (null), TrimPath will crash over it
            // This prevents this from happening
            if (!profile.about){
                profile.about = "";
            }

            if (!profile.basic){
                profile.basic = "";
            }

            if (!profile.contactinfo){
                profile.contactinfo = "";
            }

            if (!profile.picture){
                profile.picture = "";
            }

            // Put profile in array
            var profileArray = {
                p: profile
            };

            // Remove any previous lists
            $(".profile_list").remove();

            // Render template
            $sakai3_profile.after($.TemplateRenderer($sakai3_profile_template, profileArray));
        });
    };


    /////////////
    // Sign in //
    /////////////

    /**
     * Check if the user is still signed in
     * If not: redirect to signin page
     */
    var getSignedIn = function(callback){
        sakai.api.User.loadMeData(function(success, data){

            if (sakai.data.me.user.userid){
                return callback(true);
            } else {
                return callback(false);
            }

        });
    };

    /**
     * Check if the user signed in successfully
     * @param {Object} data Retrieved data
     * @param {Boolean} success The sign in succeeded (true) or failed (false)
     */
    var checkSigninSuccess = function(data, success){
        if (success){

            // Display the My Sakai page
            jQt.goTo("#mysakai", "slide");
        } else {

            // Display message on the Sign in page
            $login_fail.show();
        }
    };

    /**
     * Sign out the current user
     */
    var performSignOut = function(){
        var data = {
            "sakai:status": "offline",
            "_charset_": "utf-8"
        };
        $.ajax({
            url: sakai.config.URL.PRESENCE_SERVICE,
            type: "POST",
            success: function(){
                console.log("signed out")
            },
            data: data
        });
        
        /*
         * Will do a POST request to the logout service, which will cause the
         * session to be destroyed. After this, we will redirect again to the
         * login page. If the request fails, this is probably because of the fact
         * that there is no current session. We can then just redirect to the login
         * page again without notifying the user.
         */
        $.ajax({
            url: sakai.config.URL.LOGOUT_SERVICE,
            type: "POST",
            complete: function(){
                jQt.goTo("#signin", "slide", true);
            },
            data: {
                "sakaiauth:logout": "1",
                "_charset_": "utf-8"
            }
        });
    };

    /**
     * Sign in based on the username and password input
     */
    var performSignIn = function(){
        var data = {
            "sakaiauth:login": 1,
            "sakaiauth:un": $sakai3_username.val(),
            "sakaiauth:pw": $sakai3_password.val(),
            "_charset_": "utf-8"
        };

        $.ajax({
            url: "/system/sling/formlogin",
            type: "POST",
            success: function(){

                // Show the My Sakai screen
                checkSigninSuccess(data, true);
            },
            error: function(){

                // Show an error on the Sign in page
                checkSigninSuccess(data, false);
            },
            data: data
        });

        return false;
    };

    /**
     * Enable or disable the Sign in button, based on username and password input
     */
    var enableDisableSignin = function(){
        if ($sakai3_username.val() && $sakai3_password.val()){
            $sakai3_signin_button.removeClass("disabledButton");
        } else {
            $sakai3_signin_button.addClass("disabledButton");
        }
    };


    //////////////////////////////
    // Functions on screen open //
    //////////////////////////////

    /**
     * Execute function when the Signin screen opens
     */
    var onSigninOpen = function(){

        // Remove any previous lists
        $(".chat_list").remove();
        $(".messages_list").remove();
        $(".profile_list").remove();
        
        // Clear contacts list
        contacts = [];

        // Hide all notifications
        hideNotifications = true;
    };

    /**
     * Execute function when the My Sakai screen opens
     */
    var onMySakaiOpen = function(){
        $sakai3_password.val("");
        $("#login_fail").hide();

        // Start getting and setting the presence if it isn't al ready
        if (!checkingOnline){
            checkingOnline = true;
            getPresence();
            setPresence();
        }
        
        // Start checking for new messages if it isn't al ready
        if (!checkingMessages){
            checkingMessages = true;
            checkNewMessages();
        }
    };

    /**
     * Execute function when the Profile screen opens
     */
    var onProfileOpen = function(){
        getProfile();
    };

    /**
     * Execute function when the Profile Edit screen opens
     */
    var onProfileEditOpen = function(){
        getEditProfile();
    };

    /**
     * Execute function when the Messages screen opens
     */
    var onMessagesOpen = function(){
        getRecentMessages();
    };

    /**
     * Execute function when the Message screen opens
     */
    var onMessageOpen = function(){
        showRecentMessage(false, false);
    };
    
    /**
     * Execute function when the Chat screen opens
     */
    var onChatOpen = function(){

        // Clear the textarea
        // This is required because future additions are just appended
        $sakai3_chatroom_log.val("");
    }

    /**
     * Execute function when the Chatroom screen opens
     */
    var onChatroomOpen = function(){
        loadChatMessages();
    };


    ///////////////////
    // Event binding //
    ///////////////////

    $sakai3_password.bind("keydown", enableDisableSignin);
    $sakai3_username.bind("keydown", enableDisableSignin);

    $sakai3_signin.submit(function(){
        performSignIn();
    });

    $sakai3_signout.click(function(){
        performSignOut();
    });

    $sakai3_editprofile.submit(function(){
        performProfileSave();
    });

    $sakai3_chatroom_form.submit(function(){
        performChatSubmit();
    });

    $("#notification_container").unbind().bind('click', function(e, data){
        selectedChatContact = $("#notification_container").attr("class");
        jQt.goTo("#chatroom");
    });

    // Bind the end of an animation in the body (= new page shown)
    $sakai3_body.bind('pageAnimationEnd', function(e, data){

        // Only work with the "in" direction, otherwise the code will be executed twice
        if (data.direction == "in"){

            // Execute code dependent on the ID of the div with "current" class
            switch ($(".current")[0].id){
                case "signin":
                    onSigninOpen();
                    break;
                case "mysakai":
                    onMySakaiOpen();
                    break;
                case "profile":
                    onProfileOpen();
                    break;
                case "profile_edit":
                    onProfileEditOpen();
                    break;
                case "messages":
                    onMessagesOpen();
                    break;
                case "message":
                    onMessageOpen();
                    break;
                case "chat":
                    onChatOpen();
                    break;
                case "chatroom":
                    onChatroomOpen();
                    break;
                default:
            }
        }
    });


    //////////
    // Init //
    //////////

    /**
     * This function is called each time the page is opened or refreshed
     */
    var init = function(){

        // Determine whether the user is signed in or not
        getSignedIn(function(signedIn){

            // If the user is signed in, go to the My Sakai page
            if (signedIn) {
                jQt.goTo("#mysakai");
            }
        });
    };

    init();
});