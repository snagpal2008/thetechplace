// Click-to-load YouTube (no YouTube requests until the visitor asks for the video).
document.querySelectorAll('[data-yt-list]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/videoseries?list=' + encodeURIComponent(btn.dataset.ytList) + '&autoplay=1&rel=0';
    f.title = btn.dataset.title || 'YouTube video';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    f.allowFullscreen = true;
    btn.replaceWith(f);
  });
});

// Contact form: validates, then opens the visitor's email app with the message filled in.
var form = document.getElementById('contact-form');
if (form) {
  var TO = form.dataset.to;
  var status = document.getElementById('form-status');
  var fallback = document.getElementById('mailto-fallback');

  function setError(name, msg) {
    var el = document.getElementById(name + '-error');
    var input = form.elements[name];
    if (el) el.textContent = msg || '';
    if (input && input.setAttribute) {
      if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    }
    return !msg;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.elements.website.value) return; // honeypot
    var d = new FormData(form);
    var name = (d.get('name') || '').trim();
    var email = (d.get('email') || '').trim();
    var phone = (d.get('phone') || '').trim();
    var topic = d.get('topic') || '';
    var message = (d.get('message') || '').trim();
    var ok = true;
    ok = setError('name', name ? '' : 'Please enter your name.') && ok;
    ok = setError('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Please enter a valid email address.') && ok;
    ok = setError('topic', topic ? '' : 'Please choose what you need help with.') && ok;
    ok = setError('consent', form.elements.consent.checked ? '' : 'Please agree so Harpreet can reply to you.') && ok;
    if (!ok) {
      var first = form.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      return;
    }
    var lines = [
      'Name: ' + name,
      'Email: ' + email,
      'Phone: ' + (phone || '(not given)'),
      'Best time to reach me: ' + (d.get('time') || 'Any time'),
      'I need help with: ' + topic,
      'Area / neighbourhood: ' + ((d.get('area') || '').trim() || '(not given)'),
      'Timeline: ' + (d.get('timeline') || '(not given)'),
      '',
      message || '(no message)',
      '',
      '— Sent from the contact page on Harpreet\'s website'
    ];
    var href = 'mailto:' + TO + '?subject=' + encodeURIComponent('Website enquiry: ' + topic + ' — ' + name) + '&body=' + encodeURIComponent(lines.join('\n'));
    fallback.href = href;
    status.classList.add('show');
    status.focus();
    window.location.href = href;
  });
}
