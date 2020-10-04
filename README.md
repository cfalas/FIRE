
# FIRE (Foreshadowing the Impact of fiREs)

## Summary

Predict the economic damage of a potential fire by simply drawing the potentially burnt area on the map. Using US Census and previous wildfire data, the economic burden caused by a wildfire can be predicted.
How I Addressed This Challenge

In recent years, fires have been growing stronger, and occur more frequently than ever before. Unarguably, assessing the impacts of a fire after the fire has been completely contained is important, in order to improve and perform better the next time, and therefore minimize the economic impacts and more importantly the number of lives lost. However, there needs to be a way to predict at a certain point, what the impact of a hypothetical wildfire may be. This could be used to see which part of the fire needs to be contained first, and what the impact would be if the fire is not contained correctly.

This project provides the means to do this, through the prediction of costs of any potential fire. With the visual augmentation given by the active fire data on the map, the user can draw the shape of the fire as predicted by other services, and predict the economic impacts of the fire.

A mathematical model was created based on the population density, the mean house price, the area and the number of housing units, the area of the fire and other features, and fitted on past wildfires with reported financial impacts. Using this, a reasonably accurate model was created.

## How I Developed This Project

### Implementation details

- Upon drawing a polygon, the data analysis starts, on the front end.
- Random points within the polygon are sampled to find the proportion of the polygon that belongs to which county. In order to do this, the polygon is triangulated, the area of each triangle is found, and a cumulative distribution is created to make a uniform distribution of points on the polygon. After the coordinates of each point are found, they are queried into Nominatim Reverse Geocoding API, which returns their county.
- For each relevant county, the total area of the county, the number of houses, the population density and the average house price are queried from their respective APIs
- The data are fed into a model that predicts the total economic cost

### Tech Stack

- The solution has been implemented using JavaScript.
- The Leaflet.js library has been used in order to display the map and the tiled FIRMS2 WMS service map.
- The Leaflet.Draw library has been used to allow the drawing of polygons and shapes on the map.

### Future Improvements

- Use Google Maps API for Reverse Geocoding, which returns the zip code of each coordinate. Therefore, smaller resolution can be had, which will improve the accuracy, since the assumption that the distribution of houses is uniform in each county will be reduced to the distribution being uniform in each ZIP code, which is a lot closer to being valid.
- Find and train the model using more past fire data to improve accuracy

### How I Used Space Agency Data in This Project

- The current thermal anomalies are displayed on the map to help the user with drawing the correct area for the prediction of the fire from MOD14 and VIIRS.
- Satellite imagery from past fires has been used to improve and evaluate the model and thus improve the accuracy of the model.

## Project Demo

<https://youtu.be/Jue0H87rPGQ>

## Data & Resources

- US Census Population & Housing Datasets
- NASA MOD14 - Thermal Anomalies Products
- FIRMS2 Web Services
- Quindle Monthly Zillow Real Estate Data
- Nominatim Reverse Geocoding service
- Leaflet.js
