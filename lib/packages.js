JS.Packages(function() { with(this) {
  var lib   = '/lib/',
      jsc   = lib + 'js.class-2.0.2/min/',
      ojay  = lib + 'ojay-0.4.0/ojay/',
      yui   = 'http://yui.yahooapis.com/2.7.0/build/',
      gmaps = 'http://maps.google.com/maps?file=api&v=2&sensor=false&key=';
  
  GMAPS_KEY = 'ABQIAAAArVbgzt5nxAQAZ_iB_77caBQCULP4XOMyhPd8d_NrQQEO8sT8XBTzVWhRwEDkVfNsvzo8bf4ntGV4ZQ';
  
  pkg('YAHOO',    yui + 'yahoo-dom-event/yahoo-dom-event.js');
  
  pkg('JS.MethodChain',   jsc + 'method_chain.js');
  pkg('JS.Observable',    jsc + 'observable.js');
  pkg('JS.State',         jsc + 'state.js');
  
  pkg('Ojay',             ojay + 'core-min.js')
      .requires('JS.MethodChain')
      .requires('JS.Observable')
      .requires('JS.State')
      .requires('YAHOO');
  
  pkg('GMap2',            gmaps + GMAPS_KEY);
  pkg('GClientGeocoder',  gmaps + GMAPS_KEY);
  
  pkg('PinPoint',         lib + 'pinpoint-min.js')
      .requires('Ojay')
      .requires('GMap2')
      .requires('GClientGeocoder');
}});

