---
title: "Satellite imagery crop classification"
summary: "ResNet classification and U-Net field boundary segmentation over Google Earth Engine imagery. 92 percent accuracy across six crop types on more than 50,000 hectares."
role: "Lead, team of 2"
org: "Data Insight, agricultural analytics client"
period: "Mar 2021 to Nov 2021"
stack: ["ResNet", "U-Net", "TensorFlow", "Google Earth Engine", "GDAL", "PostGIS", "GeoJSON", "Docker"]
order: 24
---

Earth Engine and GDAL handle the preprocessing. ResNet classifies the crop, U-Net draws the field boundaries and PostGIS indexes the result for spatial queries. The output is GeoJSON the client's own tools can read. Cloud cover was the enemy for the whole project.
