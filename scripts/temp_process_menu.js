const fs = require("fs");
const path = require("path");

const raw = `1
MAIN
Spring roll
150
10
MAIN
Chicken satay
180
11
MAIN
Thai money bags wii
150
116
MAIN
Fried mixed vegetable.
150
118
MAIN
Fried vegetable sweet
150
119
MAIN
Fried tufu with ginger
150
120
MAIN
zB 120. Fried tofu with bean sp
150
14
MAIN
Deep-fried papaya salac
210
15
MAIN
Cucumber Salad
130
16
MAIN
Spicy squid salad
180
17
MAIN
Spicy seafood salad.
180
18
MAIN
Spicy shrimp salad
180
19
MAIN
Spicy sausage salad.
150
190
MAIN
Me 190. Chicken nugget.
180
191
MAIN
Se 191. Fried nugget + f
180
192
MAIN
Meatball (pork/
180
193
MAIN
Mash _ potato
130
2
MAIN
Fried wonton with shrii
150
20
MAIN
Spicy salad with glas
190
207
MAIN
Spaghetti green ci
180
208
MAIN
Spaghetti bolonai
180
209
MAIN
Spaghetti seafooc
180
21
MAIN
se 21. Spicy salad with glas
180
210
MAIN
OU Tel vIvED ee yl
210
211
MAIN
Spaghetti Chicker
180
212
MAIN
Spaghetti mushro
180
213
MAIN
Pasta with tomato
150
214
MAIN
a 214. Pork steak with red win
380
215
MAIN
Pork B.B.Q.occcccccccccseccseeceee
280
216
MAIN
Chicken,Pork with Black
228
217
MAIN
Chicken,Pork steak with brown
280
22
MAIN
Spicy minced chicken
180
23
MAIN
c 23. Spicy cashew nut sal
180
24
MAIN
Tom Yum Goong
180
25
MAIN
Tom Yum Fish
180
27
MAIN
Tom Yum Seafood
180
28
MAIN
Tom Kah Gail
190
29
MAIN
I} 29. Tom Kah Goong
190
3
MAIN
NMVAPEININTE / Ay] PL LL
110
36
MAIN
Fried rice with squid
150
4
MAIN
I) 4. Onion ring
110
5
MAIN
Fried Shrimp cakes "2
180
51
MAIN
a 51. Duck with black pep
250
52
MAIN
Y 52. Red curry with duck
250
55
MAIN
Fried chicken with cashe
180
56
MAIN
Fried chicken with ginge
180
57
MAIN
Stir-fried chicken with s
180
58
MAIN
Deep Fried chicken sweet
180
59
MAIN
Fried chicken with garlic
210
6
MAIN
B.B.Q. Chicken wing
130
60
MAIN
Fried chicken with black p
210
61
MAIN
Panang Chicken Cui
180
62
MAIN
q 62. Fried Chicken with |
180
65
MAIN
A 65. Stir-fried Chicken w
180
7
MAIN
Mind pork toast 2 xvs"
130
70
MAIN
Fried pork with black ps
210
71
MAIN
Fried pork with garlic p
210
8
MAIN
Shrimp t uaa
130
87
MAIN
SP 87. Squid with black pepper
220
9
MAIN
J 9. Garlic bread.,,
110
90
MAIN
Fried shrimp with garlic
210
92
MAIN
Prawn with black pepper
210
94
MAIN
a 94. Shrimp with salt and chili
210
95
MAIN
B95. Tempura shrimp sweet sot
210`;

const lines = raw.split("\n");
const items = [];
for (let i = 0; i < lines.length; i += 4) {
  const id = lines[i]?.trim();
  const category = lines[i+1]?.trim().toLowerCase();
  let name = lines[i+2]?.trim();
  const priceStr = lines[i+3]?.trim();
  const price = parseFloat(priceStr);
  if (id && name && !isNaN(price)) {
    name = name.replace(/^[a-zA-Z\s]*\d{1,3}\s*[.)]?\s*/, "");
    name = name.replace(/[.]{2,}/g, "");
    name = name.trim();
    items.push({ restaurant: "The View", id, name, price, category });
  }
}

const sql = [
  "-- Updated Seed from user input",
  "insert into menu_items (restaurant, id, name, price, category)",
  "values",
  items.map(i => `  ('${i.restaurant}', '${i.id}', '${i.name.replace(/'/g, "''")}', ${i.price}, '${i.category}')`).join(",\n"),
  "on conflict (restaurant, id) do update set",
  "  name = excluded.name,",
  "  price = excluded.price,",
  "  category = excluded.category;"
].join("\n");

const outPath = path.join(__dirname, "..", "supabase", "seed", "menu_items.sql");
fs.writeFileSync(outPath, sql);
console.log(`Wrote ${items.length} items to ${outPath}`);
