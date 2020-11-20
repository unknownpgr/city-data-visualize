import React, { useState } from 'react';
import { render } from 'react-dom';
import { StaticMap } from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer, PolygonLayer } from '@deck.gl/layers';
import { LightingEffect, AmbientLight, _SunLight as SunLight } from '@deck.gl/core';
//import {scaleThreshold} from 'd3-scale';
import { scaleSequential } from 'd3-scale';
//import {interpolateRainbow} from 'd3-scale-chromatic';
import { interpolateOrRd } from 'd3-scale-chromatic';
import { readString } from "react-papaparse";

// "MapboxAccessToken" 환경변수값
let MAPBOX_TOKEN = process.env.MapboxAccessToken;
if (!MAPBOX_TOKEN || MAPBOX_TOKEN.length < 2) {
  MAPBOX_TOKEN = 'pk.eyJ1IjoidW5rbm93bnBnciIsImEiOiJja2hxZnFqNmowNjhiMnJuZHJtbWV1d2Z4In0.ovJu9rfRUyO-TAuKzpCcQw';
}

export const COLOR_SCALE = x =>
  // https://github.com/d3/d3-scale-chromatic
  (
    scaleSequential()
      .domain([0, 4])
      //    .interpolator(interpolateRainbow)(x)
      .interpolator(interpolateOrRd)
  )(x) // return a string color "rgb(R,G,B)"
    .slice(4, -1)  // extract "R,G,B"
    .split(',') // spline into an array ["R", "G", "B"]
    .map(x => parseInt(x, 10));  // convert to [R, G, B]


const INITIAL_VIEW_STATE = {
  // 서울시청 좌표
  latitude: 37.5663,
  longitude: 126.9779,
  zoom: 11,
  maxZoom: 16,
  pitch: 45,
  bearing: 0
};

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0
});

const dirLight = new SunLight({
  timestamp: Date.UTC(2019, 7, 1, 22),
  color: [255, 255, 255],
  intensity: 1.0,
  //  _shadow: true
  _shadow: false
});

function getTooltip({ object }) {
  return object && `
  <div>TEST<div>
  `;
}

export default function App({ geoJson, mapStyle = 'mapbox://styles/mapbox/light-v9' }) {

  const [effects] = useState(() => {
    const lightingEffect = new LightingEffect({ ambientLight, dirLight });
    lightingEffect.shadowColor = [0, 0, 0, 0.5];
    return [lightingEffect];
  });

  const layers = [
    // only needed when using shadows - a plane for shadows to drop on
    /*
      new PolygonLayer({
        id: 'ground',
        data: landCover,
        stroked: false,
        getPolygon: f => f,
        getFillColor: [0, 0, 0, 0]
      }),
      */

    // reference: https://deck.gl/docs/api-reference/layers/geojson-layer
    new GeoJsonLayer({
      id: 'test',
      geoJson,
      opacity: 0.9,
      stroked: false,
      filled: true,
      extruded: true,
      wireframe: true,
      getElevation: f => 1000,
      getFillColor: f => [255, 255, 255],
      getLineColor: [255, 255, 255],
      pickable: true
    })
  ];

  return (
    <DeckGL
      layers={layers}
      effects={effects}
      initialViewState={INITIAL_VIEW_STATE}
      controller={true}
      getTooltip={getTooltip}
    >
      <StaticMap
        reuseMaps
        mapStyle={mapStyle}
        preventStyleDiffing={true}
        mapboxApiAccessToken={MAPBOX_TOKEN}
      />
    </DeckGL>
  );
}

export async function renderToDOM(container) {

  const file_pathes = [
    "young.txt",
    "facility.txt",
    "HangJeongDong_ver20200701.geojson"
  ];

  // Read all files asynchronously
  const files = await Promise.all(file_pathes.map(f => fetch(f)));

  // Parse files
  const proper = x => ['동', '계', '합계', '소계', '미상', '행정동'].indexOf(x[2]) < 0;
  const fix = x => {
    x = x.slice(2);
    x[0] = x[0].replace(/[.]/g, '·');
    return x;
  };
  const parse = async file => readString(await file.text()).data.filter(proper).map(fix);
  const young = (await parse(files[0])).map(x => [x[0], [x[1], x[2], x[3]].map(v => +v.replace(/,/g, ''))]);
  const facil = (await parse(files[1])).map(x => [x[0], +x[1].replace(/,/g, '')]);
  let geoJson = await files[2].json();
  geoJson.features = geoJson.features.filter(x => x.properties.sidonm == '서울특별시');


  // Build dictionary
  let data = {};
  geoJson.features.forEach(region => {
    let name = region.properties.adm_nm.split(' ').pop();
    data[name] = {};
  });
  young.forEach(row => data[row[0]]['young'] = row[1]);
  facil.forEach(row => data[row[0]]['facil'] = row[1]);

  // Map
  geoJson.features.forEach(region => {
    let name = region.properties.adm_nm.split(' ').pop();
    region.properties.test = data[name];
  });

  render(<App geoJson={geoJson} />, container);
}
