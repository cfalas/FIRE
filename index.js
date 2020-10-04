// Creating map options
var mapOptions = {
center: [60, -78.552432],
zoom: 3,
}
var map = new L.map('map', mapOptions); // Creating a map object



// Creating a Layer object
var layer = new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
map.addLayer(layer);  // Adding layer to the map

var wmsLayer = L.tileLayer.wms('https://firms2.modaps.eosdis.nasa.gov/wms/key/bc09ff9fa59fca6ebe246d4c2a0538f3/?', {
    layers: 'fires_modis_24',
    transparent: true,
    symbols: 'triangle',
    colors: '240+10+10',
    size: 5,
    styles: 'none',
    format: 'image/png'

}).addTo(map);
map.addLayer(wmsLayer)

var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

map.addControl(new L.Control.Draw({
    edit: {
        featureGroup: drawnItems,
        poly: {
            allowIntersection: false
        }
    },
    draw: {
        polygon: {
            allowIntersection: false,
            showArea: true
        }
    }
}));


function dist(a, b){
    const R = 6371e3; // metres
    const φ1 = a[0] * Math.PI/180; // φ, λ in radians
    const φ2 = b[0] * Math.PI/180;
    const Δφ = (b[0]-a[0]) * Math.PI/180;
    const Δλ = (b[1]-a[1]) * Math.PI/180;
    
    const z = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(z), Math.sqrt(1-z));
    
    return R * c; // in meters
}

function area(curr){
    sides = [dist(curr[0], curr[1]), dist(curr[0], curr[2]), dist(curr[2], curr[1])];
    let s = (sides[0] + sides[1] + sides[2])/2;
    return Math.sqrt(s * (s-sides[0]) * (s-sides[1]) * (s-sides[2]));
}

function generateDistribution(triangles) {
    var areas = [];
    var totalArea = 0;
    for (let i=0;i<triangles.length;i++){
        areas.push(area(triangles[i]));
        totalArea += areas[i];
    }
    const cumulativeDistribution = [];
    
    for (let i = 0; i < triangles.length; i++) {
      const lastValue = cumulativeDistribution[i - 1] || 0;
      const nextValue = lastValue + areas[i] / totalArea;
      cumulativeDistribution.push(nextValue);
    }
    // [area1, area1 + aera2, area1 + area2 + area3, ...]
    return cumulativeDistribution;
}

function selectRandomTriangle(triangles) {
    const cumulativeDistribution = generateDistribution(triangles);
    console.log(cumulativeDistribution);
    const rnd = Math.random();
    const index = cumulativeDistribution.findIndex(v => v > rnd);
    console.log(index)
    return triangles[index];
}

function calcRandomPoint(triangle) {
    let wb = Math.random();
    let wc = Math.random();
  
    // point will be outside of the triangle, invert weights
    if (wb + wc > 1) {
      wb = 1 - wb;
      wc = 1 - wc;
    }
  
    const [a, b, c] = triangle.map(coords => ({x: coords[0], y: coords[1]}));
  
    const rb_x = wb * (b.x - a.x);
    const rb_y = wb * (b.y - a.y);
    const rc_x = wc * (c.x - a.x);
    const rc_y = wc * (c.y - a.y);
  
    const r_x = rb_x + rc_x + a.x;
    const r_y = rb_y + rc_y + a.y;
  
    return [r_x, r_y]
}

const NUM_POINTS = 20;
var counties_loaded = 0;
var tot_waiting = 0;
const ANS_FACTOR = 0.18

function getRegionData(county){
    if(!window.localStorage['regions']){
        return $.get('https://cors-anywhere.herokuapp.com/https://www.quandl.com/api/v3/datatables/ZILLOW/REGIONS?region_type=county&api_key=mdEruGD5QeHcH2q6WhDt', function(data){
            window.localStorage['regions'] = JSON.stringify(data);
            return getRegionId(county, data);
        });
    }
    else{
        return getRegionId(county, JSON.parse(window.localStorage['regions']));
    }
}

function getRegionId(target, counties){
    counties = counties['datatable']['data']
    for(index in counties){
        let county = counties[index]
        if(county[2].includes(target)){
            return county[0]
        }
    }
    return -1
}

async function getRegionEstimate(region_id){
    return $.get('https://cors-anywhere.herokuapp.com/https://www.quandl.com/api/v3/datatables/ZILLOW/DATA?region_id=' + region_id +'&api_key=mdEruGD5QeHcH2q6WhDt').then(function(data){
        return data['datatable']['data'][0][3];
    });
}

async function getHousesPerArea(coords){
    return $.get('https://cors-anywhere.herokuapp.com/https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=' + coords[1] + '&y=' + coords[0] + '&benchmark=4&vintage=4&format=json').then((data) => {
        return [data['result']['geographies']['States'][0]['STATE'], data['result']['geographies']['Counties'][0]['COUNTY'], data['result']['geographies']['Counties'][0]['AREALAND']]
    }).then((data) => {
        return $.get('https://cors-anywhere.herokuapp.com/https://api.census.gov/data/2019/pep/housing?get=HUEST&for=county:' + data[1] + '&in=state:' + data[0]).then((new_data) => {
            return new_data[1][0] / data[2];
        })
    
    })
}

async function getEstimate(counties, county_coordinates, triangles){
    var total_area = 0;
    for(let i=0;i<triangles.length;i++) total_area+= area(triangles[i]);

    let total_counties = tot_waiting;
    var tot = 0;
    let regions = {}
    for(county in counties){
        regions[county] = getRegionData(county)
        if(regions[county]==-1) total_counties-=counties[county];
    }

    for(county in counties){
        tot+= ((counties[county] / total_counties) * total_area) * await getRegionEstimate(regions[county]) * (await getHousesPerArea(county_coordinates[county]));
    }
    return tot * ANS_FACTOR
}

async function countyLoaded(counties, county_coordinates, triangles){
    ++counties_loaded;
    console.log(counties_loaded);
    if(counties_loaded==tot_waiting){
        for(county in counties){
            console.log(county, counties[county])
        }
        var result = parseFloat((await getEstimate(counties, county_coordinates, triangles)).toPrecision(4))
        result = result.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
        document.getElementById('resval').innerHTML = result;
    }
}

map.on(L.Draw.Event.CREATED, function (event) {
    document.getElementById('res').style.visibility = 'visible';
    var layer = event.layer;
    var pts = [];
    for(pt in layer._latlngs){
        pts.push(layer._latlngs[pt]['lat']);
        pts.push(layer._latlngs[pt]['lng']);
    }
    drawnItems.addLayer(layer);

    triangle_index = earcut(pts);
    var triangles = [];
    var areas = [];
    counties_loaded = 0;
    for(var i=0;i<triangle_index.length / 3;i++){
        var curr = [];
        curr.push([pts[2*triangle_index[3*i]], pts[2*triangle_index[3*i]+1]]);
        curr.push([pts[2*triangle_index[3*i+1]], pts[2*triangle_index[3*i+1]+1]]);
        curr.push([pts[2*triangle_index[3*i+2]], pts[2*triangle_index[3*i+2]+1]]);

        triangles.push(curr);
    }

    let points = [];
    let counties = {};
    let county_coordinates = {};
    tot_waiting += NUM_POINTS;
    for(let i=0;i<NUM_POINTS;i++){
        points.push(calcRandomPoint(selectRandomTriangle(triangles)));
        $.get('https://cors-anywhere.herokuapp.com/https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' + points[i][0] + '&lon=' + points[i][1], function(data){
            if('address' in data){
                if(data['address']['county'] in counties){
                    counties[data['address']['county']] += 1
                }
                else counties[data['address']['county']] = 1
                county_coordinates[data['address']['county']] = points[i]
                countyLoaded(counties, county_coordinates, triangles)
            }
            else{
                tot_waiting-=1
            }
        });
    }

    console.log(points);
});