$(function(){


    /////////////////////////////
    // Configuration variables //
    /////////////////////////////

    var $sakai3_username = $("#sakai3_username");
    var $sakai3_password = $("#sakai3_password");
    var $sakai3_signin = $("#sakai3_signin");
    var $sakai3_signin_button = $("#sakai3_signin_button");
    var $sakai3_messages = $("#sakai3_messages");
    var $sakai3_messages_template = $("#sakai3_messages_template");
    var $login_fail = $("#login_fail");


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
        date_month = months[date.getMonth() + 1];
        date_day = date.getDate();
        date_hours = pad2(date.getHours());
        date_minutes = pad2(date.getMinutes());
        
        // Return the date string in the format MMM D, hh:mm
        return date_month + " " + date_day + ", " + date_hours + ":" + date_minutes;
    };
    
    
    //////////////
    // Messages //
    //////////////

    /**
     * Render the messages from the JSON response data
     * @param {Object} response JSON response
     */
    var renderRecentMessages = function(response){
        
        if (response) {

            // Create result objects based on response JSON data
            for (var j = 0, l = response.results.length; j < l; j++){
                // temporary internal id.
                // use the name for the id.
                response.results[j].nr = j;
                response.results[j].body = response.results[j]["sakai:body"];
                response.results[j].created = setDate(response.results[j]["sakai:created"]);
                response.results[j].from = response.results[j]["sakai:from"];
                response.results[j].messagebox = response.results[j]["sakai:messagebox"];
                response.results[j].subject = response.results[j]["sakai:subject"];
            }
            
            // Put messages in array
            var messageArray = {
                messages: response.results
            };
            
            // Render template
            $sakai3_messages.html($.TemplateRenderer($sakai3_messages_template, messageArray));
            
            // TEMP
            $(".message").click(function(){
            
            });
        } else {
            
            // Error
        }
    };
    
   /**
    * Load the recent messages for the current user
    * @param {Object|Boolean} response
    * The response that the server has send.
    * If the response is false, it means we were not able to connect to the server
    */
    var loadRecentMessages = function(response){
    
        // Render the recent message for the current user.
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
            items: 4,
            page: 0
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


    //////////////////////
    // Screen swichting //
    //////////////////////

    /**
     * Show the My Sakai screen
     */
    var showMySakaiScreen = function(){
        //$(".current").removeClass("current");
        //$("#mysakai").addClass("current");
        jQt.goTo("#mysakai", "forward");
    };

    /**
     * Show the Sign in screen
     */
    var showSigninScreen = function(){
        //$(".current").removeClass("current");
        //$("#signin").addClass("current");
        jQt.goTo("#signin", "forward");
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
            showMySakaiScreen();
        } else {
            // Display message on the Sign in page
            showSigninScreen();
            $login_fail.show();
        }
    };
    
    var performTest = function(){
        return "#mysakai";
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
});