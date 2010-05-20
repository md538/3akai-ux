$(function(){


    /////////////////////////////
    // Configuration variables //
    /////////////////////////////

    var $sakai3_username = $("#sakai3_username");
    var $sakai3_password = $("#sakai3_password");
    var $sakai3_body = $('body');
    var $sakai3_signin = $("#sakai3_signin");
    var $sakai3_signin_button = $("#sakai3_signin_button");
    var $sakai3_signout = $('#sakai3_signout');
    var $sakai3_message = $("#sakai3_message");
    var $sakai3_message_template = $("#sakai3_message_template");
    var $sakai3_messages = $("#sakai3_messages");
    var $sakai3_messages_template = $("#sakai3_messages_template");
    var $sakai3_profile = $("#sakai3_profile");
    var $sakai3_profile_template = $("#sakai3_profile_template");
    var $sakai3_editprofile = $("#sakai3_editprofile");
    var $login_fail = $("#login_fail");
    
    var $sakai3_chat = $("#sakai3_chat");
    var $sakai3_chat_template = $("#sakai3_chat_template");
    
    var $sakai3_chatroom_form = $("#sakai3_chatroom_form");
    var $sakai3_chatroom_log = $("#sakai3_chatroom_log");
    var $sakai3_chatroom_message = $("#sakai3_chatroom_message");

    var $selectedMessage;
    var $selectedChatContact;
    var checkingOnline = false;
    var messageArray;
    
    
    
//    /**
//     * Scroll to the bottom of an element
//     * @param {Object} el The element that needs to be scrolled down
//     */
//    var scroll_to_bottom = function(el){
//        el.attr("scrollTop", el.attr("scrollHeight"));
//    };






var sendMessage = function(message){

    var data = {
        "sakai:type": "chat",
        "sakai:sendstate": "pending",
        "sakai:messagebox": "outbox",
        "sakai:to": "chat:" + $selectedChatContact,
        "sakai:from": sakai.data.me.user.userid,
        "sakai:subject": "",
        "sakai:body": message,
        "sakai:category": "chat",
        "_charset_": "utf-8"
    };
    
    $.ajax({
        url: "/_user" + sakai.data.me.profile.path + "/message.create.html",
        type: "POST",
        success: function(data){
        
            // We evaluate the response after sending
            // the message and store it in an object
            var response = data; // parse to json?
            
            // Add the id to the send messages object
            // We need to do this because otherwise the user who
            // sends the message, will see it 2 times
            //addToSendMessages(response.id);
        },
        error: function(xhr, textStatus, thrownError){
            alert("An error has occured when sending the message.");
        },
        data: data
    });
}
    
    
    
    
    
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
    
    var performChatSubmit = function(){
       
        // Input and log variables to keep the code clean
        var input = $sakai3_chatroom_message.val();
        var log = $sakai3_chatroom_log.val();

        if (input.length > 0) {
            
            // Send the message
            sendMessage(input);
            
//            // Add user tag in front of input
//            input = "<Me> " + input;
//        
//            // If there is an input and output, a newline must be created in front of the input message
//            if (log.length > 0) {
//                input = "\n" + input;
//            }
//            
//            // Add new input at the end of the log
//            log = log + input;
//            
//            // Display the log in the textarea
//            $sakai3_chatroom_log.val(log);
//            
//            // Empty input field
//            $sakai3_chatroom_message.val("");
        };
    };

    /**
     * Check who of your contacts are online
     * This function is executed every 20 seconds
     */
    var showContacts = function(response){

        for (var j = 0, l = response.contacts.length; j < l; j++){
            response.contacts[j].status = response.contacts[j]["sakai:status"];
        }
        
        // Order the contacts by status, then by first name
        response.contacts.sort(sortColumns);

        // Assemble message array
        onlineContacts = {
            all: response.contacts
        };        

        // Remove any previous lists
        $(".chat_list").remove();
        
        // Render the template
        $sakai3_chat.after($.TemplateRenderer($sakai3_chat_template, onlineContacts));
        
        // Bind the message list items
        $('.chat_li').unbind('click').bind('click', function(e, data){
        
            // Equal the global $selectedChatContact variable with the ID of the clicked list item (= contact.user)
            $selectedChatContact = e.currentTarget.id;
        });
    };

    /**
     * Check who of your friends are online
     * This function is executed every 5 seconds
     */
    var checkOnline = function(){
        // Receive your online friends through an Ajax request
        $.ajax({
            url: sakai.config.URL.PRESENCE_CONTACTS_SERVICE,
            cache: false,
            success: function(data){
                showContacts(data);
                setTimeout(checkOnline, 5000);
                goBackToLogin = true;
            }
        });
    };


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
        if (profile.picture && profile.path) {
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
            getUserImage(messageArray.messages[$selectedMessage].from);
        } else {

            // Assemble message array
            message = {
                all: messageArray.messages[$selectedMessage],
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

                // Equal the global $selectedMessage variable with the ID of the clicked list item (= message.nr)
                $selectedMessage = e.currentTarget.id;
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
            error: function() {
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
            if (!profile.about) {
                profile.about = "";
            }

            if (!profile.basic) {
                profile.basic = "";
            }

            if (!profile.contactinfo) {
                profile.contactinfo = "";
            }

            if (!profile.picture) {
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
        if (success) {

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
                console.log("logged out");
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


    ///////////////////
    // Event binding //
    ///////////////////

    $sakai3_password.bind("keydown", enableDisableSignin);
    $sakai3_username.bind("keydown", enableDisableSignin);

    $sakai3_signin.submit(function(){
        performSignIn();
    });

    $sakai3_signout.click(function(e){
        performSignOut();
    });

    $sakai3_editprofile.submit(function(){
        performProfileSave();
    });
    
    $sakai3_chatroom_form.submit(function(){
        performChatSubmit();
    });

    // Bind the end of an inimation in the body (= new page shown)
    $sakai3_body.bind('pageAnimationEnd', function(e, data){

        // Only work with the "in" direction, otherwise the code will be executed twice
        if (data.direction == "in"){

            // Execute code dependent on the ID of the div with "current" class
            switch ($(".current")[0].id){
                case "signin":
                    break;
                case "mysakai":
                    $sakai3_password.val("");
                    $("#login_fail").hide();
                    break;
                case "profile":
                    getProfile();
                    break;
                case "profile_edit":
                    getEditProfile();
                    break;
                case "messages":
                    getRecentMessages();
                    break;
                case "message":
                    showRecentMessage(false, false);
                    break;
                case "chat":
                
                    // Only start checking who's online when it isn't al ready
                    if (!checkingOnline) {
                        checkingOnline = true;
                        checkOnline();
                    }
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