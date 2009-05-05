JS.Packages(function() { with(this) {
  var lib   = '/lib/',
      jsc   = lib + 'js.class-dev/min/',
      ojay  = lib + 'ojay-0.4.0/ojay/',
      yui   = 'http://yui.yahooapis.com/2.7.0/build/';
  
  pkg('YAHOO',                yui + 'yahoo-dom-event/yahoo-dom-event.js');
  pkg('YAHOO.util.Selector',  yui + 'selector/selector-min.js')
      .requires('YAHOO');
  
  pkg('JS.MethodChain',   jsc + 'method_chain.js');
  pkg('JS.Observable',    jsc + 'observable.js');
  pkg('JS.State',         jsc + 'state.js');
  
  pkg('Ojay',             ojay + 'core-min.js')
      .requires('JS.MethodChain')
      .requires('JS.Observable')
      .requires('JS.State')
      .requires('YAHOO')
      .requires('YAHOO.util.Selector');
  
  loader(function(cb) {
      google.load('maps', '2.x');
      google.setOnLoadCallback(cb);
  }).provides('GMap2');
  
  pkg('PinPoint',         lib + 'pinpoint-min.js')
      .requires('Ojay')
      .requires('GMap2');
}});

