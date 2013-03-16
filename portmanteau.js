// Global variables
var map;
var cityName;
var markersArray = [];
var image_clicked = 0;
var building_image = new google.maps.GroundOverlay("image_area.png");
var map_center = new google.maps.LatLng(44.427178,26.105742);
function initialize() {
    // Initially center the map over Bucharest and place the image on top of it
    var mapOptions = {
        center: map_center,
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.SATELLITE
    };
    map = new google.maps.Map(document.getElementById('map_canvas'), mapOptions);

    var input = document.getElementById('searchTextField');
    var autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo('bounds', map);

    var imageBounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(44.4032679880013,26.072268031494104),
            new google.maps.LatLng(44.45107823568948,26.139215968505823));
    building_image = new google.maps.GroundOverlay("image_area.png",imageBounds);
    building_image.setMap(map);
    addClickListener(map_center);

    // Add a listener for when the user searches for a place
    google.maps.event.addListener(autocomplete, 'place_changed', function() {
        input.className = '';
        image_clicked = 0;
        var place = autocomplete.getPlace();
        var cityName = place.name

        // If place is not found, return
        if (!place.geometry) {
            input.className = 'notfound';
            return;
        }

    // If place is Bucharest / Bucuresti, set a special center to place the image correctly
    if (cityName == 'Bucharest' || cityName == 'Bucuresti') {
        var map_center = new google.maps.LatLng(44.427178,26.105742);
    } else {
        var map_center = place.geometry.location
    }
    // Place the image on the map at the searched location
    building_image.setMap(null);
    map.setCenter(map_center);
    map.setZoom(14);
    setImage(map_center);

    // Get the city name and look for it through the city database for population and area info
    $(document).ready(function() {
        $.ajax({
            type: "GET",
            url: "city_database.txt",
            dataType: "text",
            success: function(data) {processCsv(data);}
        });
    });
    function processCsv(csv_data) {
        var lines = [];
        var lines = $.csv.toObjects(csv_data);

        var area = $.map(lines, function(val) {
            return val.name == cityName ? val.area : null;
        });
        var density = $.map(lines, function(val) {
            return val.name == cityName ? val.density : null;
        });

        if (area.length == 0 || density.length == 0) {
            document.getElementById('area').innerHTML = "0.0%"
                document.getElementById('population').innerHTML = "0"
                return;
        } else {
            population_displaced = parseFloat(4.50) * parseFloat(density[0]);
            surface_displaced = ((parseFloat(4.50) / parseFloat(area[0])) * parseFloat(100)).toFixed(1);
            document.getElementById('area').innerHTML = surface_displaced + "%"
                document.getElementById('population').innerHTML = population_displaced
        }
    }
    // Add a listener for a click on the image to toggle the marker
    addClickListener(map_center);
    });
}

// The function that creates the image overlay relative to a coordinate
function setImage(center) {
    //map.setZoom(14);
    //var scale = Math.pow(2,map.getZoom());
    var scale = Math.pow(2,14);
    var proj = map.getProjection();
    var wc = proj.fromLatLngToPoint(center);
    var bounds = new google.maps.LatLngBounds();
    var sw = new google.maps.Point(((wc.x * scale) - 390)/ scale, ((wc.y * scale) - 390)/ scale);
    bounds.extend(proj.fromPointToLatLng(sw));
    var ne = new google.maps.Point(((wc.x * scale) + 390)/ scale, ((wc.y * scale) + 390)/ scale);
    bounds.extend(proj.fromPointToLatLng(ne));
    building_image = new google.maps.GroundOverlay("image_area.png",bounds);
    building_image.setMap(map);
}

// Cleans all the existing markers
function cleanMarker() {
    if (markersArray) {
        for (i in markersArray) {
            markersArray[i].setMap(null);
        }
        markersArray.length = 0;
    }
}

// Adds a custom marker used to move the image overlay
function initMarker(location) {
    cleanMarker();
    marker = new google.maps.Marker({
        position: location,
           map: map,
           icon: 'buldozer.png',
           draggable: true
    });
    // When dragging the marker has ended, reposition the image overlay
    google.maps.event.addListener(marker, 'dragend', function(event) {
        building_image.setMap(null);
        setImage(marker.getPosition());
        addClickListener(marker.getPosition());
    });
    markersArray.push(marker);
    image_clicked = 1;
}

// Adds a listener for when the image overlay is clicked to toggle the marker on / off
function addClickListener(marker_position) {
    google.maps.event.addListener(building_image, 'click', function() {
        if (image_clicked == 1) {
            cleanMarker();
            image_clicked = 0;
        } else {
            initMarker(marker_position);
        }
    });
}

function random() {
    var searchBox = document.getElementById("searchTextField");
    searchBox.value = "Randomizing..."
        $(document).ready(function() {
            $.ajax({
                type: "GET",
                url: "city_database.txt",
                dataType: "text",
                success: function(data) {getRandom(data);}
            });
        });
    function getRandom(csv_data) {
        // Get a random city object from the array, map it and set variables accordingly
        var cities = [];
        var cities = $.csv.toObjects(csv_data);
        var random_city = [];
        var random_city = cities[Math.floor(Math.random() * cities.length)];
        var city = $.map(random_city, function(val) {
            return val;
        });
        cityName = city[0];
        cityArea = city[2];
        cityDensity = city[3];
        var geocoder = new google.maps.Geocoder();
        geocoder.geocode({
            address : cityName,
            region: 'no'
        }, function(results, status){
            var map_center= results[0].geometry.location;
            var cityCountry = results[0].formatted_address;
            // Place the image on the map at the random location
            cleanMarker();
            image_clicked = 0;
            building_image.setMap(null);
            map.setCenter(map_center);
            map.setZoom(14);
            setImage(map_center);
            population_displaced = parseFloat(4.50) * parseFloat(cityDensity);
            surface_displaced = ((parseFloat(4.50) / parseFloat(cityArea)) * parseFloat(100)).toFixed(1);
            document.getElementById("area").innerHTML = surface_displaced + "%"
            document.getElementById("population").innerHTML = population_displaced
            searchBox.value = cityCountry;
        addClickListener(map_center);
        });
    }
}

// Add a height element to the map canvas, calculated according to window size
var height = (parseFloat(window.screen.availHeight) * 68) / 100;
document.getElementById('map_canvas').style.height = height + "px";
//window.onresize = function(event) {
//    document.getElementById('map_canvas').style.height = height + "px";
//}
// On DOM window load, run all of the above
google.maps.event.addDomListener(window, 'load', initialize);
