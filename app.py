from flask import Flask, render_template, request
import requests

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('track.html')

@app.route('/nearby')
def nearby():
    service_type = request.args.get('service')
    lat = request.args.get('lat')
    lng = request.args.get('lng')

    # Use OpenStreetMap Overpass API to get nearby services
    nearby_services = get_nearby_services(service_type, lat, lng)

    # Pass data to nearby.html for rendering
    return render_template('nearby.html', services=nearby_services, service_type=service_type)

def get_nearby_services(service_type, lat, lng):
    # Convert service type to appropriate OSM tags
    service_mapping = {
        'hospital': 'amenity=hospital',
        'fuel': 'amenity=fuel',
        'workshop': 'shop=car_repair',
        'police': 'amenity=police'
    }
    
    osm_tag = service_mapping.get(service_type, None)
    if not osm_tag:
        return []  # Return empty list if the service type is not recognized

    # Overpass API query to find nearby services
    overpass_url = "http://overpass-api.de/api/interpreter"
    overpass_query = f"""
    [out:json];
    node(around:5000,{lat},{lng})[{osm_tag}];
    out body;
    """
    response = requests.get(overpass_url, params={'data': overpass_query})

    if response.status_code == 200:
        data = response.json()
        # Extracting relevant details: name, latitude, longitude, and distance
        services = []
        for element in data['elements']:
            if 'tags' in element and 'name' in element['tags']:
                services.append({
                    'name': element['tags']['name'],
                    'lat': element['lat'],
                    'lon': element['lon']
                })
        return services[:5]  # Return the top 5 results
    else:
        print("Error fetching data from Overpass API")
        return []

if __name__ == '__main__':
    app.run(debug=True)
