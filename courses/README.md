# Lessons

Lessons are grouped by subject, one folder each, so every subject can grow on its own:

```
courses/
  <subject>/                 physics, chemistry, biology, earth-space
    subject.json             name, colour, blurb, order on the site
    README.md                this subject's lesson list (npm run readme)
    _shared/                 optional: 3D helpers only this subject's lessons use
    <slug>/                  one lesson; its URL is /<slug>/ (slugs are unique across subjects)
      lesson.json            catalog entry and all lesson text
      scene.js               the 3D world (engine lesson, see lib/engine/README.md)
      index.html             or: a complete bundled lesson (the high school labs)
      cover.webp, cover-480.webp
```

## Add a lesson to a subject

1. Pick the topic and grades from [docs/curriculum-map.md](../docs/curriculum-map.md) and mark it there.
2. Create `courses/<subject>/<slug>/lesson.json` and `scene.js` (see [lib/engine/README.md](../lib/engine/README.md)). Set `level` (`primary` grades 1–5, `middle` grades 6–9, `high-school` grades 10–12) and `grades` `[from, to]` inside that level. The subject comes from the folder.
3. Check it: `LESSONS=<slug> OUT=/tmp/one npm run build`, then in `video/`: `DIST=/tmp/one node scripts/check.mjs <slug> --shots /tmp/shots` and `DIST=/tmp/one node scripts/covers.mjs <slug>`.
4. Run `npm run readme` to refresh the lesson lists.

A new lesson only touches its own folder (plus the subject's `README.md` and the map), so lessons for different subjects never conflict.

## [Physics](physics/) (33)

### Primary school (11)

- [Pushes and Pulls](physics/push-pull/) · Grades 1–2
- [Where Does Sound Come From?](physics/making-sound/) · Grades 1–4
- [How Do We See Things?](physics/light-and-materials/) · Grades 1–4
- [Will It Float or Sink?](physics/float-sink/) · Grades 2–3
- [Balanced Forces and Friction](physics/friction-forces/) · Grades 3–4
- [Magnets Pull and Push](physics/magnets/) · Grades 3–4
- [Make the Bulb Light Up](physics/simple-circuit/) · Grades 4–5
- [Waves on a Pond](physics/water-waves/) · Grades 4–5
- [Speed and Energy](physics/speed-and-energy/) · Grades 4–5
- [Where Does Heat Go?](physics/heat-flow/) · Grades 4–5
- [Where Does Our Energy Come From?](physics/energy-sources/) · Grades 4–5

### Middle school (12)

- [Weight and Springs](physics/weight-springs/) · Grade 6
- [Forces and Motion](physics/forces-motion/) · Grades 6–8
- [Kinetic and Potential Energy: Energy Is Conserved](physics/mechanical-energy/) · Grades 6–9
- [Sound Waves: Pitch and Loudness](physics/sound-waves/) · Grade 7
- [Light: Rays, Reflection and Mirrors](physics/light-reflection/) · Grade 7
- [Speed: Distance and Time](physics/speed-motion/) · Grade 7
- [Density](physics/density/) · Grade 8
- [Pressure in Solids, Liquids and the Air](physics/pressure/) · Grade 8
- [Buoyancy: Archimedes' Principle](physics/buoyancy/) · Grade 8
- [Levers and Turning Forces](physics/levers/) · Grade 8
- [Thermal Energy: Conduction, Convection, Radiation](physics/thermal-energy/) · Grade 8
- [Electric Circuits: Series, Parallel, Ohm's Law](physics/electric-circuits/) · Grades 8–9

### High school (10)

- [The Photoelectric Effect](physics/photoelectric-step/) · Grades 10–12
- [Observing Capacitor Charging and Discharging](physics/capacitor-step/) · Grades 10–12
- [Experiment: Acceleration vs. Force and Mass](physics/accel-force-step/) · Grades 10–12
- [Experiment: Verifying Conservation of Mechanical Energy](physics/energy-step/) · Grades 10–12
- [Experiment: Exploring Projectile Motion](physics/projectile-step/) · Grades 10–12
- [Centripetal Force vs. Radius, Angular Velocity and Mass](physics/centripetal-step/) · Grades 10–12
- [Self-Induction and Eddy Currents](physics/self-induction-step/) · Grades 10–12
- [Measuring EMF and Internal Resistance](physics/emf-step/) · Grades 10–12
- [Magnetic Field of an Electric Current](physics/current-field-step/) · Grades 10–12
- [Brownian Motion and Diffusion](physics/brownian-step/) · Grades 10–12

## [Chemistry](chemistry/) (43)

### Primary school (7)

- [Ice, Water and Steam](chemistry/states-of-water/) · Grades 2–4
- [What Is It Made Of?](chemistry/materials-properties/) · Grades 2–3
- [Heat It, Cool It](chemistry/changing-materials/) · Grades 2–3
- [Air Is All Around Us](chemistry/air-around-us/) · Grade 4
- [Making Muddy Water Clean](chemistry/clean-water/) · Grades 4–5
- [Mix, Dissolve, Separate](chemistry/mixtures-dissolving/) · Grade 5
- [Everything Is Made of Tiny Particles](chemistry/tiny-particles/) · Grade 5

### Middle school (11)

- [The Particle Model of Matter](chemistry/particle-model/) · Grade 6
- [Air, Oxygen and Burning](chemistry/air-oxygen/) · Grade 6
- [Separating Mixtures](chemistry/separating-mixtures/) · Grade 6
- [Atoms: Protons, Neutrons and Electrons](chemistry/atoms/) · Grade 7
- [The Periodic Table](chemistry/periodic-table/) · Grade 7
- [Molecules and Bonds: Ionic and Covalent](chemistry/molecules-bonds/) · Grade 7
- [Chemical Reactions and Conservation of Mass](chemistry/chemical-reactions/) · Grade 8
- [Reaction Rate: Temperature, Concentration, Surface Area](chemistry/reaction-rate/) · Grade 8
- [Acids, Bases and the pH Scale](chemistry/acids-bases/) · Grade 8
- [Metals and the Reactivity Series](chemistry/metals-reactivity/) · Grade 9
- [Fuels and Hydrocarbons: Burning and Energy](chemistry/fuels-combustion/) · Grade 9

### High school (25)

- [Industrial Ammonia Synthesis (Haber Process)](chemistry/haber-step/) · Grades 10–12
- [Factors Affecting Reaction Rate](chemistry/rate-step/) · Grades 10–12
- [Ball-and-Stick Models of Organic Molecules](chemistry/ball-stick-step/) · Grades 10–12
- [Strong Acid–Strong Base Titration](chemistry/titration-step/) · Grades 10–12
- [Preparation and Properties of Chlorine](chemistry/chlorine-step/) · Grades 10–12
- [Ironmaking in a Blast Furnace](chemistry/blast-furnace-step/) · Grades 10–12
- [Metal Smelting: Molten-Salt Electrolysis and the Thermite Reaction](chemistry/smelting-step/) · Grades 10–12
- [Coal Utilization: Coal Gasification](chemistry/coal-gas-step/) · Grades 10–12
- [Sulfuric Acid by the Contact Process](chemistry/sulfuric-step/) · Grades 10–12
- [Hydrolysis of Salts and Its Applications](chemistry/hydrolysis-step/) · Grades 10–12
- [Industrial Cement Production](chemistry/cement-step/) · Grades 10–12
- [Iron and Its Compounds: Changing Oxidation States](chemistry/iron-step/) · Grades 10–12
- [Principles of Electrolysis: CuCl₂ Solution and Brine](chemistry/electrolysis-step/) · Grades 10–12
- [Preparation and Properties of Ammonia (Fountain Experiment)](chemistry/ammonia-step/) · Grades 10–12
- [Factors That Shift Chemical Equilibrium](chemistry/equilibrium-step/) · Grades 10–12
- [Flame Tests and Atomic Spectra](chemistry/flame-step/) · Grades 10–12
- [Galvanic Cells: From One Electrolyte to Two](chemistry/galvanic-step/) · Grades 10–12
- [Ionization, Solution Conductivity and Ionic Reactions](chemistry/conductivity-step/) · Grades 10–12
- [Concentrated and Dilute Nitric Acid; Nitrogen Oxides](chemistry/nitric-lab-step/) · Grades 10–12
- [Bromine from Seawater: The Air Blow-Out Process](chemistry/bromine-step/) · Grades 10–12
- [Properties of Sodium (and Putting Out Sodium Fires)](chemistry/sodium-step/) · Grades 10–12
- [Sulfur, SO₂ and Sulfuric Acid: Converting Between Oxidation States](chemistry/sulfur-step/) · Grades 10–12
- [Oxygen-Absorption Corrosion and Designing a Hand Warmer](chemistry/corrosion-step/) · Grades 10–12
- [The Chlor-Alkali Industry](chemistry/chlor-alkali-step/) · Grades 10–12
- [Hou's Soda Process](chemistry/hou-soda-step/) · Grades 10–12

## [Biology](biology/) (26)

### Primary school (12)

- [What Do Animals Need to Live?](biology/animal-needs/) · Grades 1–2
- [The Parts of a Plant](biology/plant-parts/) · Grades 1–3
- [What Do Plants Need to Grow?](biology/plant-needs/) · Grades 2–3
- [Habitats: The Right Home](biology/habitats/) · Grades 2–3
- [Flowers, Bees and Seeds](biology/seeds-pollinators/) · Grades 2–5
- [Life Cycles: Butterfly, Frog and Bean](biology/life-cycles/) · Grades 3–5
- [How Do We See and Hear?](biology/senses/) · Grades 3–4
- [Inside Your Body](biology/inside-the-body/) · Grades 3–5
- [Like Parents, Not Quite the Same](biology/traits/) · Grade 3
- [Food Chains: Who Eats Whom?](biology/food-chains/) · Grades 4–5
- [Food and Nutrition: A Balanced Plate](biology/food-and-nutrition/) · Grades 4–5
- [Fungi and Bacteria: Tiny Helpers and Germs](biology/fungi-and-bacteria/) · Grades 4–5

### Middle school (9)

- [Cells: Plant and Animal Cells Under the Microscope](biology/cells/) · Grade 6
- [From Cells to Tissues, Organs and Systems](biology/body-organization/) · Grade 6
- [Classifying Living Things](biology/classification/) · Grade 6
- [Microorganisms: Bacteria, Viruses and Protists](biology/microorganisms/) · Grade 6
- [Photosynthesis: How Plants Make Food](biology/photosynthesis/) · Grade 7
- [Cellular Respiration: Energy from Food](biology/respiration/) · Grade 7
- [How Water and Food Travel Through a Plant](biology/plant-transport/) · Grade 7
- [Digestion: How Your Body Breaks Down Food](biology/digestion/) · Grade 8
- [The Heart and Circulation](biology/circulation/) · Grade 8

### High school (5)

- [Water Uptake and Loss in Plant Cells](biology/plasmolysis-step/) · Grades 10–12
- [Transport Across Cell Membranes](biology/transport-step/) · Grades 10–12
- [Generation and Conduction of Nerve Impulses](biology/impulse-step/) · Grades 10–12
- [Observing Mitosis in Root-Tip Meristem Cells](biology/mitosis-step/) · Grades 10–12
- [Conditions Affecting Enzyme Activity](biology/enzyme-step/) · Grades 10–12

## [Earth & Space](earth-space/) (34)

### Primary school (11)

- [Why Do We Have Day and Night?](earth-space/day-night/) · Grades 1–2
- [How Do Shadows Change During the Day?](earth-space/shadows/) · Grades 1–2
- [What Is the Weather Like Today?](earth-space/weather-watch/) · Grades 1–3
- [How Do Wind and Water Shape the Land?](earth-space/erosion/) · Grades 2–4
- [What Shapes Does the Land Have?](earth-space/landforms/) · Grades 2–3
- [Why Does the Moon Change Shape?](earth-space/moon-phases/) · Grades 3–5
- [What Can Rock Layers Tell Us?](earth-space/rocks-fossils/) · Grades 3–4
- [Why Does the Ground Shake and Volcanoes Erupt?](earth-space/shaking-earth/) · Grades 4–5
- [Where Is Earth's Water and How Does It Move?](earth-space/earths-water/) · Grades 4–5
- [What Is Soil Made Of?](earth-space/soil/) · Grade 5
- [The Sun, the Stars and Gravity](earth-space/sun-and-stars/) · Grade 5

### Middle school (9)

- [The Solar System: Sizes, Orbits and Gravity](earth-space/solar-system/) · Grade 6
- [Why Do We Have Seasons?](earth-space/seasons/) · Grade 6
- [Solar and Lunar Eclipses](earth-space/eclipses/) · Grade 6
- [Earth's Layers and Plate Tectonics](earth-space/plate-tectonics/) · Grades 6–8
- [The Rock Cycle](earth-space/rock-cycle/) · Grades 6–8
- [Fossils and the History of Earth](earth-space/geologic-time/) · Grades 6–8
- [The Water Cycle and the Sun's Energy](earth-space/water-cycle/) · Grades 6–8
- [Weather: Air Masses, Fronts and Pressure](earth-space/weather-fronts/) · Grades 6–8
- [Climate and the Greenhouse Effect](earth-space/climate-greenhouse/) · Grades 6–8

### High school (14)

- [Development of River Landforms](earth-space/river-step/) · Grades 10–12
- [Migration of the Subsolar Point: Seasons and Climate Zones](earth-space/insolation-step/) · Grades 10–12
- [World Ocean Currents: Patterns and Effects](earth-space/currents-step/) · Grades 10–12
- [Ocean–Atmosphere Interaction: El Niño and La Niña](earth-space/enso-step/) · Grades 10–12
- [How the Atmosphere Is Heated](earth-space/heating-step/) · Grades 10–12
- [Formation and Recognition of Karst Landforms](earth-space/karst-step/) · Grades 10–12
- [Global Climate Change and National Security](earth-space/carbon-step/) · Grades 10–12
- [Formation of Tectonic Landforms](earth-space/tectonic-step/) · Grades 10–12
- [Geographic Significance of Earth's Motions](earth-space/earth-motion-step/) · Grades 10–12
- [Soil-Forming Factors and Soil Profiles](earth-space/soil-step/) · Grades 10–12
- [Thermal Circulation](earth-space/thermal-step/) · Grades 10–12
- [Horizontal Motion of the Atmosphere: Wind](earth-space/wind-step/) · Grades 10–12
- [The Water Cycle and Its Geographic Significance](earth-space/water-cycle-step/) · Grades 10–12
- [Pressure Belts, Wind Belts and the Three-Cell Circulation](earth-space/circulation-step/) · Grades 10–12
