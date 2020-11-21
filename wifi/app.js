import React from 'react';
import { render } from 'react-dom';
import { StaticMap } from 'react-map-gl';
import { AmbientLight, PointLight, LightingEffect } from '@deck.gl/core';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
import DeckGL from '@deck.gl/react';

// Set your mapbox token here
let MAPBOX_TOKEN = process.env.MapboxAccessToken; // eslint-disable-line
if (!MAPBOX_TOKEN || MAPBOX_TOKEN.length < 2) {
  MAPBOX_TOKEN = 'pk.eyJ1IjoidW5rbm93bnBnciIsImEiOiJja2hxZnFqNmowNjhiMnJuZHJtbWV1d2Z4In0.ovJu9rfRUyO-TAuKzpCcQw';
}

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0
});

const pointLight1 = new PointLight({
  color: [255, 255, 255],
  intensity: 0.8,
  position: [-0.144528, 49.739968, 80000]
});

const pointLight2 = new PointLight({
  color: [255, 255, 255],
  intensity: 0.8,
  position: [-3.807751, 54.104682, 8000]
});

const lightingEffect = new LightingEffect({ ambientLight, pointLight1, pointLight2 });

const material = {
  ambient: 0.64,
  diffuse: 0.6,
  shininess: 3,
  specularColor: [51, 51, 51]
};

const INITIAL_VIEW_STATE = {
  longitude: 126.9779,
  latitude: 37.5663,
  zoom: 10,
  minZoom: 1,
  maxZoom: 15,
  pitch: 40.5,
  bearing: -27
};

// 더 많은 세팅: https://colorbrewer2.org
// set "Number of data classes" to 6
export const colorRange = [
  // [237, 248, 251],
  // [204, 236, 230],
  // [153, 216, 201],
  // [102, 194, 164],
  // [44, 162, 95],
  // [0, 109, 44]
  [42 * 1, 42 * 1, 42 * 1 + 20],
  [42 * 2, 42 * 2, 42 * 2 + 20],
  [42 * 3, 42 * 3, 42 * 3 + 20],
  [42 * 4, 42 * 4, 42 * 4 + 20],
  [42 * 5, 42 * 5, 42 * 5 + 20],
  [42 * 6, 42 * 6, 42 * 6 + 20]
];

function getTooltip({ object }) {
  if (!object) {
    return null;
  }
  const lat = Math.round(100000 * object.position[1]) / 100000;
  const lng = Math.round(100000 * object.position[0]) / 100000;
  const count = object.points.length;

  let kindDict = {};
  let nameList = '';
  object.points.forEach(point => {
    if (kindDict[point[2]]) {
      kindDict[point[2]]++;
    } else {
      kindDict[point[2]] = 1;
    }
    nameList += `<li>${point[3]}</li>`;
  });

  let countList = '';
  Object.keys(kindDict).forEach(x => {
    if (x !== 'null') {
      countList = `<li>${x} : ${kindDict[x]}개</li>` + countList;
    } else {
      countList += `<li>그 외 : ${kindDict[x]}개</li>`;
    }
  });

  return {
    html: `\
  <div>위도: ${lat}</div>
  <div>경도: ${lng}</div>
  <div>총 ${count} 개의 도서관이 이 부근에 있습니다.</div>
  <div>
    <ul>
      ${countList}
    <ul>
  </div>
  <div class="nameList">
    ${nameList}
  </div>
    `};
}

/* eslint-disable react/no-deprecated */
export default function App({
  data,
  mapStyle = 'mapbox://styles/mapbox/dark-v9',
  radius = 500,
  lowerPercentile = 0,
  upperPercentile = 100,
  coverage = 0.8
}) {
  const layers = [
    new HexagonLayer({
      id: 'wifi',
      colorRange,
      coverage,
      data,
      elevationRange: [5, 100],
      elevationScale: 30,
      extruded: true,
      getPosition: d => d,
      pickable: true,
      radius,
      upperPercentile,
      material,
      transitions: {
        elevationScale: 50
      }
    })
  ];

  return (
    <DeckGL
      layers={layers}
      effects={[lightingEffect]}
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
  let data = (await (await fetch("libs.json")).json())["DATA"].map(x => [+x.ydnts, +x.xcnts, x.lbrry_se_name, x.lbrry_name]);
  console.log(data);
  render(<App data={data} />, container);
}
