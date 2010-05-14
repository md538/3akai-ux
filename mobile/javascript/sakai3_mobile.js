$(function(){


    /////////////////////////////
    // Configuration variables //
    /////////////////////////////

    var $sakai3_username = $("#sakai3_username");
    var $sakai3_password = $("#sakai3_password");
    var $sakai3_signin = $("#sakai3_signin");
    var $sakai3_signin_button = $("#sakai3_signin_button");
    var $sakai3_message = $("#sakai3_message");
    var $sakai3_message_template = $("#sakai3_message_template");
    var $sakai3_messages = $("#sakai3_messages");
    var $sakai3_messages_template = $("#sakai3_messages_template");
    var $sakai3_profile = $("#sakai3_profile");
    var $sakai3_profile_template = $("#sakai3_profile_template");
    var $login_fail = $("#login_fail");

    var $selectedMessage;
    var messageArray;


    //////////
    // Date //
    //////////

    /**
     * Add a zero in front of the number if it is lower than 10
     * @param {Integer} number Number to pad
     */
    function pad2(number) {
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

            if (messageArray.messages.length > 0) {

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
    var getRecentMessages = function() {

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
    
    var getProfile = function(){
        //sakai.data.me.profile.basic).unidepartment
        
        //profile.firstname = sakai.data.me.profile.firstName;
        //profile.lastname = sakai.data.me.profile.lastName;
        //profile.email = sakai.data.me.profile.email;
        
        sakai.api.User.loadMeData();
        
        profile = sakai.data.me.profile; alert(profile.aboutme);
        /*for (i in profile) {
            alert(profile[i]);
        }*/

        //profile.aboutme = $.parseJSON(profile.aboutme);
        
        //alert(aboutme.aboutme);
        
        // Put profile in array
        var profileArray = {
            profile: profile
        };
        
        // Remove any previous lists
        $(".profile_list").remove();
        
        // Render template
        $sakai3_profile.after($.TemplateRenderer($sakai3_profile_template, profileArray));
    };


    /////////////
    // Sign in //
    /////////////

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
     * Sign in based on the username and password input
     */
    var performSignin = function(){
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
        if ($sakai3_username.val() && $sakai3_password.val()) {
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
        performSignin();
    });

    // Bind the end of an inimation in the body (= new page shown)
    $('body').bind('pageAnimationEnd', function(e, data){

        // Only work with the "in" direction, otherwise the code will be executed twice
        if (data.direction == "in") {

            // Execute code dependent on the ID of the div with "current" class
            switch ($(".current")[0].id) {
                case "messages":
                    getRecentMessages();
                    break;
                case "mysakai":
                    $sakai3_password.val("");
                    $("#login_fail").hide();
                    break;
                case "profile":
                    getProfile();
                    break;
                case "message":
                    showRecentMessage(false, false);
                    break;
                default:
            }
        }
    });
});