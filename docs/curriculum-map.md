# Curriculum map: primary and middle school

Which science topics each grade needs, and which lesson covers each one. Status marks are refreshed by `npm run coverage` (✅ built, ○ planned).

## Defaults behind this map

- **Grade bands follow Vietnam's school levels**: primary = grades 1–5, middle = grades 6–9. High school (grades 10–12) is the Tongjiang Lab set.
- **Topics follow the US Next Generation Science Standards (NGSS)**, K–5 by grade and the 6–8 middle school band, because the site is in English. The NGSS column gives the performance expectation codes.
- **Cross-checked against Vietnam's 2018 general education programme (GDPT 2018)**: *Tự nhiên và Xã hội* (grades 1–3), *Khoa học* (grades 4–5) and *Khoa học tự nhiên* (KHTN, grades 6–9). The VN column names the matching strand; "—" means the topic is NGSS only. Grade 9 topics come from KHTN 9 and NGSS 6–8, since NGSS has no separate grade 9.
- **Subjects**: Physics, Chemistry (matter and its changes, from grade 1), Biology, Earth & Space (includes the geography-style Earth science labs).
- One lesson per topic. A lesson lists the grades it fits as `grades: [from, to]`; it is filed under its first grade.

This is a map of topics, not a copy of either standard. Grade placement is a choice; move a row when a better fit shows up.

## Primary school (grades 1–5)

### Physics

| Grade | Topic | NGSS | VN GDPT 2018 | Lesson | Status |
|---|---|---|---|---|---|
| 1–2 | Pushes and pulls start, stop and turn things | K-PS2-1, K-PS2-2 | — | `push-pull` | ✅ |
| 1–4 | Sound comes from vibrations; loud and soft, high and low | 1-PS4-1 | Khoa học 4: Âm thanh | `making-sound` | ✅ |
| 1–4 | Light lets us see; transparent, translucent, opaque, mirrors | 1-PS4-2, 1-PS4-3 | Khoa học 4: Ánh sáng | `light-and-materials` | ✅ |
| 2–3 | Floating and sinking | 2-PS1-2 | Khoa học 4: Nước | `float-sink` | ✅ |
| 3–4 | Balanced and unbalanced forces, friction | 3-PS2-1, 3-PS2-2 | — | `friction-forces` | ✅ |
| 3–4 | Magnets attract, repel and work through things | 3-PS2-3, 3-PS2-4 | — | `magnets` | ✅ |
| 4–5 | Heat moves from warm to cold; conductors and insulators | 4-PS3-2 | Khoa học 4: Nhiệt | `heat-flow` | ✅ |
| 4–5 | Faster means more energy; energy passes on in collisions | 4-PS3-1, 4-PS3-3 | — | `speed-and-energy` | ✅ |
| 4–5 | A complete circuit, switches, conductors | 4-PS3-2, 4-PS3-4 | Khoa học 5: Năng lượng điện, mạch điện | `simple-circuit` | ✅ |
| 4–5 | Waves: height and length, waves move things up and down | 4-PS4-1 | — | `water-waves` | ✅ |
| 4–5 | Energy sources: sun, wind, water, fuels | 4-ESS3-1 | Khoa học 5: Năng lượng chất đốt, mặt trời, gió, nước | `energy-sources` | ✅ |

### Chemistry

| Grade | Topic | NGSS | VN GDPT 2018 | Lesson | Status |
|---|---|---|---|---|---|
| 2–3 | Materials and their properties: hard, bendy, waterproof | 2-PS1-1, 2-PS1-2 | — | `materials-properties` | ✅ |
| 2–4 | Solid, liquid, gas: ice, water, steam | 2-PS1-4 | Khoa học 4: Nước, ba thể | `states-of-water` | ✅ |
| 2–3 | Heating and cooling: changes you can undo and changes you cannot | 2-PS1-4 | Khoa học 5: Sự biến đổi của chất | `changing-materials` | ✅ |
| 4 | Air is real: it takes up space, has mass, feeds fire | 5-PS1-1 | Khoa học 4: Không khí | `air-around-us` | ✅ |
| 4–5 | Water properties and cleaning water by filtering | 5-PS1-3 | Khoa học 4: Nước (làm sạch nước) | `clean-water` | ✅ |
| 5 | Mixtures and solutions: mixing, dissolving, separating | 5-PS1-3, 5-PS1-4 | Khoa học 5: Hỗn hợp và dung dịch | `mixtures-dissolving` | ✅ |
| 5 | Tiny particles: mass is kept when things dissolve or change | 5-PS1-1, 5-PS1-2 | Khoa học 5: Sự biến đổi của chất | `tiny-particles` | ✅ |

### Biology

| Grade | Topic | NGSS | VN GDPT 2018 | Lesson | Status |
|---|---|---|---|---|---|
| 1–2 | What animals need to live | K-LS1-1 | TN&XH 1–2: Thực vật và động vật | `animal-needs` | ✅ |
| 1–3 | Parts of a plant and what each part does | 1-LS1-1 | TN&XH 1–3: Thực vật và động vật | `plant-parts` | ✅ |
| 2–3 | What plants need to grow | 2-LS2-1 | TN&XH 2–3, Khoa học 4: Thực vật | `plant-needs` | ✅ |
| 2–3 | Habitats and how living things fit them | 2-LS4-1, 3-LS4-3 | TN&XH 2: Môi trường sống | `habitats` | ✅ |
| 2–5 | Flowers, pollinators and seeds | 2-LS2-2 | Khoa học 5: Sự sinh sản của thực vật | `seeds-pollinators` | ✅ |
| 3–5 | Life cycles: butterfly, frog, bean | 3-LS1-1 | Khoa học 5: Sự sinh sản của động vật | `life-cycles` | ✅ |
| 3 | Inherited traits and traits from the environment | 3-LS3-1, 3-LS3-2 | — | `traits` | ✅ |
| 3–4 | Our senses: how eyes and ears work | 4-LS1-2 | TN&XH 3: Cơ quan thần kinh, giác quan | `senses` | ✅ |
| 3–5 | Inside the body: bones, muscles, heart, lungs, stomach | 4-LS1-1 | TN&XH 2–3: Con người và sức khỏe | `inside-the-body` | ✅ |
| 4–5 | Food and nutrition: food groups and a balanced plate | 5-PS3-1 | Khoa học 4: Dinh dưỡng | `food-and-nutrition` | ✅ |
| 4–5 | Food chains: producers, consumers, decomposers | 5-LS2-1 | Khoa học 4: Chuỗi thức ăn | `food-chains` | ✅ |
| 4–5 | Fungi and bacteria: helpful and harmful | 5-LS2-1 | Khoa học 4: Nấm; Khoa học 5: Vi khuẩn | `fungi-and-bacteria` | ✅ |

### Earth & Space

| Grade | Topic | NGSS | VN GDPT 2018 | Lesson | Status |
|---|---|---|---|---|---|
| 1–2 | Day and night: Earth spins | 1-ESS1-1 | TN&XH 1: Trái Đất và bầu trời | `day-night` | ✅ |
| 1–2 | Shadows and the Sun's path | 1-ESS1-1, 5-ESS1-2 | TN&XH 1–3: Trái Đất và bầu trời | `shadows` | ✅ |
| 1–3 | Weather: sun, wind, rain, temperature | K-ESS2-1, 3-ESS2-1 | TN&XH 1–2: Thời tiết | `weather-watch` | ✅ |
| 2–3 | Landforms and bodies of water | 2-ESS2-2, 2-ESS2-3 | TN&XH 3: Bề mặt Trái Đất | `landforms` | ✅ |
| 2–4 | Wind and water shape the land | 2-ESS1-1, 4-ESS2-1 | — | `erosion` | ✅ |
| 3–5 | Phases of the Moon | 1-ESS1-1 | TN&XH 3: Mặt Trăng | `moon-phases` | ✅ |
| 3–4 | Rocks, layers and fossils | 3-LS4-1, 4-ESS1-1 | — | `rocks-fossils` | ✅ |
| 4–5 | Earthquakes and volcanoes | 4-ESS2-2, 4-ESS3-2 | — | `shaking-earth` | ✅ |
| 4–5 | Earth's water and the water cycle | 5-ESS2-2 | Khoa học 4: Vòng tuần hoàn của nước | `earths-water` | ✅ |
| 5 | Soil: what it is made of | 5-ESS2-1 | Khoa học 5: Đất | `soil` | ✅ |
| 5 | The Sun is a star; stars and gravity | 5-ESS1-1, 5-PS2-1 | — | `sun-and-stars` | ✅ |

## Middle school (grades 6–9)

### Physics

| Grade | Topic | NGSS | VN GDPT 2018 | Lesson | Status |
|---|---|---|---|---|---|
| 6 | Weight and springs: gravity pulls, springs stretch | MS-PS2-4 | KHTN 6: Lực, trọng lượng, biến dạng lò xo | `weight-springs` | ✅ |
| 6–8 | Forces and motion: net force, friction, action and reaction | MS-PS2-1, MS-PS2-2 | KHTN 6: Lực, lực ma sát | `forces-motion` | ✅ |
| 7 | Speed: distance, time and graphs | MS-PS2-2 | KHTN 7: Tốc độ | `speed-motion` | ✅ |
| 7 | Sound waves: frequency, amplitude, pitch, loudness | MS-PS4-1 | KHTN 7: Âm thanh | `sound-waves` | ○ |
| 7 | Light: rays, reflection and mirrors | MS-PS4-2 | KHTN 7: Ánh sáng | `light-reflection` | ○ |
| 7 | Magnets and magnetic fields | MS-PS2-3, MS-PS2-5 | KHTN 7: Từ | `magnetic-fields` | ○ |
| 8 | Density | MS-PS1-2 | KHTN 8: Khối lượng riêng | `density` | ✅ |
| 8 | Pressure in solids, liquids and the air | — | KHTN 8: Áp suất | `pressure` | ✅ |
| 8 | Buoyancy: Archimedes' principle | — | KHTN 8: Lực đẩy Archimedes | `buoyancy` | ✅ |
| 8 | Levers and turning forces | — | KHTN 8: Moment lực, đòn bẩy | `levers` | ○ |
| 8 | Thermal energy: conduction, convection, radiation | MS-PS3-3, MS-PS3-4 | KHTN 8: Nhiệt | `thermal-energy` | ○ |
| 8–9 | Electric circuits: series, parallel, Ohm's law | — | KHTN 8: Điện; KHTN 9: Điện | `electric-circuits` | ○ |
| 6–9 | Kinetic and potential energy, energy is conserved | MS-PS3-1, MS-PS3-2, MS-PS3-5 | KHTN 6: Năng lượng; KHTN 9: Năng lượng cơ học | `mechanical-energy` | ○ |
| 9 | Refraction and lenses | MS-PS4-2 | KHTN 9: Khúc xạ, thấu kính | `refraction-lenses` | ○ |
| 9 | Electromagnets, motors and generators | MS-PS2-3 | KHTN 9: Điện từ | `electromagnetism` | ○ |

### Chemistry

| Grade | Topic | NGSS | VN GDPT 2018 | Lesson | Status |
|---|---|---|---|---|---|
| 6 | The particle model: solids, liquids, gases, changes of state | MS-PS1-4 | KHTN 6: Các thể của chất | `particle-model` | ✅ |
| 6 | Air and oxygen: what air is made of, burning | MS-PS1-2 | KHTN 6: Oxygen, không khí | `air-oxygen` | ✅ |
| 6 | Mixtures and separating them: filter, evaporate, distil | MS-PS1-2 | KHTN 6: Hỗn hợp, tách chất | `separating-mixtures` | ✅ |
| 7 | Atoms: protons, neutrons, electrons | MS-PS1-1 | KHTN 7: Nguyên tử | `atoms` | ✅ |
| 7 | The periodic table | MS-PS1-1 | KHTN 7: Bảng tuần hoàn | `periodic-table` | ✅ |
| 7 | Molecules and bonds: ionic and covalent | MS-PS1-1 | KHTN 7: Phân tử, liên kết hóa học | `molecules-bonds` | ✅ |
| 8 | Chemical reactions and conservation of mass | MS-PS1-2, MS-PS1-5 | KHTN 8: Phản ứng hóa học, định luật bảo toàn khối lượng | `chemical-reactions` | ○ |
| 8 | Reaction rate: temperature, concentration, surface area | — | KHTN 8: Tốc độ phản ứng | `reaction-rate` | ○ |
| 8 | Acids, bases and the pH scale | — | KHTN 8: Acid, base, thang pH | `acids-bases` | ○ |
| 9 | Metals and the reactivity series | — | KHTN 9: Kim loại, dãy hoạt động | `metals-reactivity` | ○ |
| 9 | Fuels and hydrocarbons: burning and energy | MS-PS1-6 | KHTN 9: Hydrocarbon, nhiên liệu | `fuels-combustion` | ○ |

### Biology

| Grade | Topic | NGSS | VN GDPT 2018 | Lesson | Status |
|---|---|---|---|---|---|
| 6 | Cells: plant and animal cells under the microscope | MS-LS1-1, MS-LS1-2 | KHTN 6: Tế bào | `cells` | ✅ |
| 6 | From cells to tissues, organs and systems | MS-LS1-3 | KHTN 6: Từ tế bào đến cơ thể | `body-organization` | ✅ |
| 6 | Classifying living things | — | KHTN 6: Đa dạng thế giới sống | `classification` | ✅ |
| 6 | Microorganisms: bacteria, viruses, protists | MS-LS1-1 | KHTN 6: Virus, vi khuẩn, nguyên sinh vật | `microorganisms` | ○ |
| 7 | Photosynthesis | MS-LS1-6 | KHTN 7: Quang hợp | `photosynthesis` | ○ |
| 7 | Cellular respiration | MS-LS1-7 | KHTN 7: Hô hấp tế bào | `respiration` | ○ |
| 7 | Water and nutrient transport in plants | MS-LS1-6 | KHTN 7: Trao đổi nước và chất dinh dưỡng | `plant-transport` | ○ |
| 8 | Digestion | MS-LS1-3 | KHTN 8: Tiêu hóa | `digestion` | ○ |
| 8 | Heart and circulation | MS-LS1-3 | KHTN 8: Tuần hoàn | `circulation` | ○ |
| 8 | Breathing and the lungs | MS-LS1-3 | KHTN 8: Hô hấp | `breathing` | ○ |
| 8 | The nervous system and reflexes | MS-LS1-8 | KHTN 8: Thần kinh và giác quan | `nervous-system` | ○ |
| 8 | Ecosystems: food webs and energy pyramids | MS-LS2-1, MS-LS2-3 | KHTN 8: Sinh thái | `ecosystems` | ○ |
| 9 | Genes, DNA and chromosomes | MS-LS3-1 | KHTN 9: Di truyền | `dna-genes` | ○ |
| 9 | Inheritance: dominant and recessive, Punnett squares | MS-LS3-2 | KHTN 9: Di truyền | `inheritance` | ○ |
| 9 | Natural selection and evolution | MS-LS4-4, MS-LS4-6 | KHTN 9: Tiến hóa | `natural-selection` | ○ |

### Earth & Space

| Grade | Topic | NGSS | VN GDPT 2018 | Lesson | Status |
|---|---|---|---|---|---|
| 6 | The solar system: scale, orbits and gravity | MS-ESS1-2, MS-ESS1-3 | KHTN 6: Hệ Mặt Trời, Ngân Hà | `solar-system` | ✅ |
| 6 | Seasons: Earth's tilt | MS-ESS1-1 | KHTN 6: Chuyển động nhìn thấy của Mặt Trời | `seasons` | ✅ |
| 6 | Moon phases and eclipses | MS-ESS1-1 | KHTN 6: Chuyển động nhìn thấy của Mặt Trăng | `eclipses` | ✅ |
| 6–8 | Earth's layers and plate tectonics | MS-ESS2-2, MS-ESS2-3 | — | `plate-tectonics` | ○ |
| 6–8 | The rock cycle | MS-ESS2-1 | — | `rock-cycle` | ○ |
| 6–8 | Fossils and the history of Earth | MS-ESS1-4, MS-LS4-1 | — | `geologic-time` | ○ |
| 6–8 | The water cycle and the Sun's energy | MS-ESS2-4 | — | `water-cycle` | ○ |
| 6–8 | Weather: air masses, fronts, pressure | MS-ESS2-5 | — | `weather-fronts` | ○ |
| 6–8 | Climate and the greenhouse effect | MS-ESS2-6, MS-ESS3-5 | — | `climate-greenhouse` | ○ |
| 6–8 | Natural hazards: earthquakes, volcanoes, storms | MS-ESS3-2 | — | `natural-hazards` | ○ |
| 9 | Natural resources and energy for a sustainable future | MS-ESS3-1, MS-ESS3-3 | KHTN 9: Năng lượng với cuộc sống, môi trường | `resources-sustainability` | ○ |
