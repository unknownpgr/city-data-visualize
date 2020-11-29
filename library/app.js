import React from 'react';
import { render } from 'react-dom';
import { StaticMap } from 'react-map-gl';
import { AmbientLight, PointLight, LightingEffect } from '@deck.gl/core';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
import { GeoJsonLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import { readString } from "react-papaparse";

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
  [42 * 1, 42 * 1, 42 * 1 + 20],
  [42 * 2, 42 * 2, 42 * 2 + 20],
  [42 * 3, 42 * 3, 42 * 3 + 20],
  [42 * 4, 42 * 4, 42 * 4 + 20],
  [42 * 5, 42 * 5, 42 * 5 + 20],
  [42 * 6, 42 * 6, 42 * 6 + 20]
];

function getTooltip({ object }) {
  if (!object) { return null; }
  if (!object.position) {
    // Tooltip for GeoJson Layer
    return object && {
      html: `\
      <div>
        <h1>${object.properties.adm_nm}</h1>
        <div>인구 수</div>
        <ul>
        <li>전체 : ${object.data[3]}</li>
        <li>남 : ${object.data[4]}</li>
        <li>여 : ${object.data[5]}</li>
        </ul>
      </div>
      `
    };
  }

  // Tooltip for hexagon layer
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

  let region = object.points[0];

  return {
    html: `\
  <div>위도: ${lat}</div> 
  <div>경도: ${lng}</div>
  <div><strong>총 ${count} 개</strong>의 도서관이 이 부근에 있습니다.</div>
  <div>이 구역이 위치한 ${region[4]} ${region[5]}의 인구는 ${region[7]}명으로,</div>
  <div>인구 대비 도서관 개수는 <strong>십만 명당 ${Math.round(count * 100000 / region[7])}개</strong> 정도입니다.</div>
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

// Check if given point `test` is inside a polygon `vert`.
function checkPolyIn(vert, test) {
  let n = vert.length;
  var i, j, c = 0;
  for (i = 0, j = n - 1; i < n; j = i++) {
    if (((vert[i][1] > test[1]) != (vert[j][1] > test[1])) &&
      (test[0] < (vert[j][0] - vert[i][0]) * (test[1] - vert[i][1]) / (vert[j][1] - vert[i][1]) + vert[i][0]))
      c = !c;
  }
  return c;
}

// Convert population data into color
function color(row) {
  let value = +row.popRatio * 2 * 255;
  return [value, value, value];
}

/* eslint-disable react/no-deprecated */
export default function App({
  data,
  mapStyle = 'mapbox://styles/mapbox/dark-v9',
  radius = 500,
  upperPercentile = 100,
  coverage = 0.8,
  geoJson
}) {
  const layers = [
    new GeoJsonLayer({
      id: 'test',
      data: geoJson,
      opacity: 0.9,
      stroked: false,
      filled: true,
      extruded: true,
      wireframe: true,
      getElevation: f => 0.1,
      getFillColor: f => color(f),
      getLineColor: [255, 255, 255],
      pickable: true
    }),

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
  const file_pathes = [
    "population.txt",
    "libs.json",
    "HangJeongDong_ver20200701.geojson"
  ];

  // Read all files asynchronously
  const files = await Promise.all(file_pathes.map(f => fetch(f)));

  // Parse population file
  const proper = x => ['동', '계', '합계', '소계', '미상', '행정동'].indexOf(x[2]) < 0;
  const fix = x => {
    x = x.slice(1);
    x[1] = x[1].replace(/[.]/g, '·');
    for (let i = 2; i < 14; i++) {
      x[i] = +x[i].replace(/,/g, '');
    }
    return x;
  };
  const parse = async file => readString(await file.text()).data.filter(proper).map(fix);
  const pop = await parse(files[0]);

  // Parse geoJson file
  let geoJson = await files[2].json();
  geoJson.features = geoJson.features.filter(x => x.properties.sidonm == '서울특별시');

  // Build dictionary
  let popData = {};
  let popMax = 0;
  geoJson.features.forEach(region => {
    let name = region.properties.adm_nm.split(' ').pop();
    popData[name] = 0;
  });
  pop.forEach(row => {
    popData[row[1]] = row;
    popMax = Math.max(popMax, row[3]);
  });

  // Map population data into geoJson
  geoJson.features.forEach(region => {
    let name = region.properties.adm_nm.split(' ').pop();
    let row = popData[name];
    region.data = row;
    region.popRatio = row[3] / popMax;
  });

  // Parse library data
  let data = (await (files[1]).json())["DATA"].map(x => [+x.ydnts, +x.xcnts, x.lbrry_se_name, x.lbrry_name]);

  // Find region for library position
  let regions = geoJson.features;
  data.forEach((row, j) => {
    let currRegion = null;
    for (let i = 0; i < regions.length; i++) {
      if (checkPolyIn(regions[i].geometry.coordinates[0][0], [row[0], row[1]])) {
        currRegion = regions[i];
        break;
      }
    }
    if (currRegion) data[j] = row.concat(currRegion.data);
    else console.log(row);
  });

  render(<App data={data} geoJson={geoJson} />, container);
}
