PinPoint = new JS.Class({
    include: Ojay.Observable,
    
    initialize: function(container) {
        this._container = Ojay(container);
        this._elements = {};
        this._container.insert(this.getHTML());
        
        this._map = new GMap2(this._elements._map);
        this._map.addControl(new GSmallMapControl());
        this._map.addControl(new GMenuMapTypeControl());
        
        this.klass.MAP_CONFIG.forEach(function(flag) { this._map[flag]() }, this);
        
        this._geocoder = new GClientGeocoder();
        this._marker = new GMarker(new GLatLng(0,0));
        this._map.addOverlay(this._marker);
    },
    
    getHTML: function() {
        if (this._html) return this._html;
        var self = this, klass = self.klass, elements = self._elements;
        
        this._html = Ojay.HTML.div({className: klass.CONTAINER_CLASS}, function(h) {
            elements._form = Ojay( h.form(function(h) {
                var id = klass.uniqueID();
                h.label({htmlFor: id}, klass.SEARCH_LABEL);
                elements._address = h.input({type: 'text', id: id});
                h.input({type: 'submit', value: klass.BUTTON_TEXT});
            }) );
            elements._map = h.div({className: klass.MAP_CLASS});
        });
        
        elements._form.on('submit', function(form, evnt) {
            evnt.stopDefault();
            this.search();
        }, this);
        
        return this._html;
    },
    
    setLatLng: function(lat, lng, zoom) {
        var latlng = new GLatLng(lat, lng);
        this._map.setCenter(latlng, zoom);
        this._marker.setLatLng(latlng);
        this.notifyObservers('locationchange', {
            lat: this.klass.toDecPl(lat, 6),
            lng: this.klass.toDecPl(lng, 6)
        });
    },
    
    search: function(address) {
        address = address || this._elements._address.value;
        this._geocoder.getLocations(address, function(response) {
            var place = response.Placemark[0];
            if (!place) return;
            
            var coords = place.Point.coordinates,
                box    = place.ExtendedData.LatLonBox,
                bounds = new GLatLngBounds(new GLatLng(box.south, box.west),
                                           new GLatLng(box.north, box.east)),
                
                zoom   = this._map.getBoundsZoomLevel(bounds);
            
            this.setLatLng(coords[1], coords[0], zoom);
        }.bind(this));
    },
    
    extend: {
        uniqueID: function() {
            var base = '__pinpoint__', i = 0;
            while (document.getElementById(base + i)) i += 1;
            return base + i;
        },
        
        toDecPl: function(value, precision) {
            var f = Math.pow(10, precision);
            return Math.round(value * f) / f;
        },
        
        CONTAINER_CLASS:  'pinpoint-container',
        MAP_CLASS:        'pinpoint-map',
        SEARCH_LABEL:     'Address',
        BUTTON_TEXT:      'Search',
        
        MAP_CONFIG: [ 'enableDragging',
                      'disableDoubleClickZoom',
                      'enableContinuousZoom',
                      'enableScrollWheelZoom',
                      'enablePinchToZoom' ]
    }
});

JS.MethodChain.addMethods(GMap2);
Ojay(window).on('unload', GUnload);

