(function($) {
    /**
     * This add-ons shows and validates a Google reCAPTCHA
     */
    $.fn.bootstrapValidator.addOns.reCaptcha = {
        html5Attributes: {
            element: 'element',
            message: 'message',
            publickey: 'publicKey',
            theme: 'theme',
            url: 'url'
        },

        // The captcha field name, generated by Google reCAPTCHA
        CAPTCHA_FIELD: 'recaptcha_response_field',

        /**
         * @param {BootstrapValidator} validator The BootstrapValidator instance
         * @param {Object} options The add-on options. Consists of the following keys:
         * - element: The ID of element showing the captcha
         * - theme: The theme name provided by Google.
         * See https://developers.google.com/recaptcha/docs/customization for the list of available themes
         * - publicKey: The public key provided by Google
         * - url: The URL that verify the captcha. It takes recaptcha_challenge_field, recaptcha_response_field parameters and
         * responses an encoded JSON string with valid and message keys
         * { "valid": true or false, "message": The error message }
         * - message: The error message that will be shown in case the captcha is not valid
         * You don't need to define it if the back-end URL above returns the message
         */
        init: function(validator, options) {
            var that = this;

            if (typeof Recaptcha === 'undefined') {
                throw new Error('reCaptcha add-on requires Google Recaptcha. Ensure that you include recaptcha_ajax.js to page');
            }

            Recaptcha.create(options.publicKey, options.element, {
                 theme: options.theme || 'red',
                 callback: reCaptchaLoaded
            });

            // Called when the captcha is loaded completely
            function reCaptchaLoaded() {
                $('#recaptcha_reload').on('click', function(e) {
                    validator.addField(that.CAPTCHA_FIELD);
                });

                validator
                    .getForm()
                    .on('added.field.bv', function(e, data) {
                        // The field 'recaptcha_response_field' has just been added
                        if (data.field === that.CAPTCHA_FIELD) {
                            // Move icon to other position
                            var $icon = data.element.data('bv.icon');
                            $icon.insertAfter('#' + options.element);
                        }
                    })
                    // Add new field after loading captcha
                    .bootstrapValidator('addField', that.CAPTCHA_FIELD, {
                        validators: {
                            callback: {
                                message: options.message,
                                callback: function(value, validator, $field) {
                                    return true;
                                },
                                onError: function(e, data) {
                                    // Reload the captcha
                                    Recaptcha.reload();
                                }
                            }
                        }
                    })
                    .on('success.validator.bv', function(e, data) {
                        if (data.field === that.CAPTCHA_FIELD) {
                            // User enter a captcha
                            // Hide the feedback icon
                            data.element.data('bv.icon').hide();
                        }
                    })
                    .on('submit', function(e) {
                        var captcha = Recaptcha.get_response();
                        if (captcha === '') {
                            return false;
                        }

                        var isValid = true,
                            message = null;
                        $.ajax({
                            async: false,
                            type: 'POST',
                            url: options.url,
                            data: {
                                recaptcha_challenge_field: Recaptcha.get_challenge(),
                                recaptcha_response_field: captcha
                            },
                            dataType: 'json',
                            success: function(response) {
                                isValid = (response.valid === true || response.valid === 'true');
                                message = response.message;
                            }
                        });

                        if (!isValid) {
                            validator.updateStatus(that.CAPTCHA_FIELD, validator.STATUS_INVALID, 'callback');
                            if (message) {
                                validator.updateMessage(that.CAPTCHA_FIELD, 'callback', message);
                            }
                            return false;
                        } else {
                            return true;
                        }
                    });
            };
        }
    };
}(window.jQuery));
