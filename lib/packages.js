JS.Packages(function() { with(this) {
  var lib   = '/lib/',
      jsc   = lib + 'js.class-dev/min/',
      ojay  = lib + 'ojay-0.4.0/ojay/',
      yui   = 'http://yui.yahooapis.com/2.7.0/build/',
      
      GKEYS = {
          '10.0.2.2:8000':  'ABQIAAAArVbgzt5nxAQAZ_iB_77caBR-5oywdloojr3wCGctvtY4YLrIFxTp2Uv8Tzdhpc707bQaOPGPEQ3PzA',
          'localhost:8000': 'ABQIAAAArVbgzt5nxAQAZ_iB_77caBQCULP4XOMyhPd8d_NrQQEO8sT8XBTzVWhRwEDkVfNsvzo8bf4ntGV4ZQ'
      },
      
      gkey = GKEYS[location.hostname + ':' + location.port];
  
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
  
  file('http://www.google.com/jsapi?key=' + gkey)
      .provides('google.load');
  
  loader(function(cb) {
      google.load('maps', '2.x', {callback: cb});
  })  .provides('GMap2')
      .requires('google.load');
  
  pkg('PinPoint',         lib + 'pinpoint-min.js')
      .requires('Ojay')
      .requires('GMap2');
}});

