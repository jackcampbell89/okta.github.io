(function($) {
  $(function() {
    // On DOM ready, create myOkta iframe and add listeners once.
    var iframe = $('<iframe id="myOktaIFrame" src="https://login.okta.com" style="display:none"></iframe>');
    $('body').append(iframe);
    window.addEventListener('message', receiveMessage, false);
    document.addEventListener('visibilitychange', checkSuccess, false);

    sendMessage();
  });

  /**
   * When the page visibility changes, check if we should retry replacement.
   */
  function checkSuccess() {
    if (typeof document.hidden !== "undefined") {
      if (!document.hidden) {
        if ( $('.okta-preview-domain').first().text() == 'https://{yourOktaDomain}' ) {
          // We haven't replaced yet: try again.
          window.reloadMyOktaIFrame();
        } else {
          // We've succeeded: don't try again in the future.
          document.removeEventListener('visibilitychange', checkSuccess, false);
        }
      }
    }
  }

  /**
   * Reload the iframe and send it a message.
   * Globally available so that other contexts can reload when they want to.
   */
  window.reloadMyOktaIFrame = function() {
    // Reload the iframe and bust cache by updating its source.
    var now = new Date();
    var myOktaSrc = "https://login.okta.com?docRetry=" + now.getTime();
    $('#myOktaIFrame').attr("src", myOktaSrc);

    sendMessage();
  }

  /**
   * Once iframe has loaded, send it a message.
   */
  function sendMessage() {
    $('#myOktaIFrame').on( 'load', function() {
      iframe.get(0).contentWindow.postMessage({messageType: 'get_accounts_json'}, 'https://login.okta.com');
    });
  }

  /**
   * Once we've received a message back, process it and do our replacement.
   */
  function receiveMessage(event) {
    // Verify the event origin is trusted
    if (event.origin !== 'https://login.okta.com' || !event.data) {
      return;
    }

    function findPreviewOrg(accounts) {
      // Extract the first 'oktapreview' domain
      for (i = 0; i < accounts.length; i++) {
        if (accounts[i].origin.indexOf('.oktapreview.com') !== -1){
          return accounts[i].origin;
        }
      }
      return 'https://{yourOktaDomain}';
    }

    var previewOrg = findPreviewOrg(event.data);

    // Replace all occurances of 'https://{yourOktaDomain}' with
    // the last used oktapreview account: 'https://dev-{number}.oktapreview.com
    $('.okta-preview-domain').text(previewOrg);
  }
})(jQuery);
