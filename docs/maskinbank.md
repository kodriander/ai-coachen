# Maskinbanken

Listan över utrustning och övningar som AI-coachen planerar med. Varje övning får en egen
stillbild och en kort loop under `assets/exercises/<id>/` och en rad i `assets/exercises/index.json`.

Regler för bilderna: egen stil (se nedan), inga märkesloggor, och aldrig bilder, animationer
eller text från openGym eller andra appar som förlaga. Allt här är vanliga gymövningar.

Stil: mjuk 3D-render, studioljus, mörk bakgrund #07080C, maskin i matt grafit, en detalj i lime
#DDF47A, ansiktslös träningsdocka i ljusgrått där musklerna som jobbar lyser svagt i lime,
tre fjärdedelsvinkel från sidan, samma kamerahöjd i alla bilder.

## Utrustning (id: namn, typ)

- lopband: Löpband, kondition
- trappmaskin: Trappmaskin, kondition
- crosstrainer: Crosstrainer, kondition
- cykel: Motionscykel, kondition
- roddmaskin: Roddmaskin, kondition
- hantlar: Hantlar, fria vikter
- skivstang: Skivstång och viktskivor, fria vikter
- bank: Platt bänk, fria vikter
- justerbar-bank: Justerbar bänk, fria vikter
- rack: Knäböjställning, fria vikter
- kettlebell: Kettlebells, fria vikter
- chinsstang: Chinsstång, kroppsvikt
- dipsstall: Dipsställning, kroppsvikt
- brostpress-maskin: Bröstpress, maskin
- lutande-brostpress-maskin: Lutande bröstpress, maskin
- axelpress-maskin: Axelpress, maskin
- latsdrag-maskin: Latsdrag, maskin
- rodd-maskin: Sittande rodd, maskin
- benpress: Benpress, maskin
- hack-squat: Hack squat, maskin
- benspark: Benspark, maskin
- larcurl: Lårcurl, maskin
- abduktor: Abduktor och adduktor, maskin
- kabel: Kabelställning, kabel
- smith: Smithmaskin, maskin
- ryggresning: Ryggresningsbänk, kroppsvikt

## Övningar (id: namn, grupp, utrustning)

Prov (görs först): bankpress, latsdrag, benpress-ovning, hantelcurl, lopband-ovning.

### Bröst
- bankpress: Bänkpress, skivstang + bank
- lutande-bankpress: Lutande bänkpress, skivstang + justerbar-bank
- hantelpress: Hantelpress, hantlar + bank
- lutande-hantelpress: Lutande hantelpress, hantlar + justerbar-bank
- brostpress: Bröstpress i maskin, brostpress-maskin
- lutande-brostpress: Lutande bröstpress i maskin, lutande-brostpress-maskin
- kabelflyes: Kabelflyes, kabel
- armhavningar: Armhävningar, kroppsvikt
- dips: Dips, dipsstall

### Rygg
- chins: Chins, chinsstang
- latsdrag: Latsdrag, latsdrag-maskin (eller kabel)
- sittande-rodd: Sittande rodd, rodd-maskin (eller kabel)
- hantelrodd: Hantelrodd, hantlar + bank
- skivstangsrodd: Skivstångsrodd, skivstang
- face-pulls: Face pulls, kabel
- marklyft: Marklyft, skivstang

### Axlar
- staende-press: Stående press, skivstang
- sittande-hantelpress: Sittande hantelpress, hantlar + justerbar-bank
- sidolyft: Sidolyft, hantlar (eller kabel)
- omvanda-flyes: Omvända flyes, hantlar (eller kabel)
- axelpress: Axelpress i maskin, axelpress-maskin

### Armar
- stangcurl: Stångcurl, skivstang
- hantelcurl: Hantelcurl, hantlar
- hammarcurl: Hammarcurl, hantlar
- kabelcurl: Kabelcurl, kabel
- triceps-pushdown: Triceps pushdown, kabel
- fransk-press: Fransk press, skivstang + bank
- overhead-extension: Overhead extension, hantlar (eller kabel)

### Ben
- knaboj: Knäböj, skivstang + rack
- frontboj: Frontböj, skivstang + rack
- benpress-ovning: Benpress, benpress
- hack-squat-ovning: Hack squat, hack-squat
- utfall: Utfall, hantlar
- bulgarisk-split-squat: Bulgarisk split squat, hantlar + bank
- rumanskt-marklyft: Rumänskt marklyft, skivstang (eller hantlar)
- benspark-ovning: Benspark, benspark
- larcurl-ovning: Lårcurl, larcurl
- hoftlyft: Höftlyft, skivstang + bank
- vadpress: Vadpress, benpress (eller smith)
- abduktor-ovning: Abduktor, abduktor
- adduktor-ovning: Adduktor, abduktor
- smith-knaboj: Knäböj i smithmaskin, smith

### Bål
- planka: Planka, kroppsvikt
- hangande-benlyft: Hängande benlyft, chinsstang
- kabelcrunch: Kabelcrunch, kabel
- pallof-press: Pallof press, kabel
- ryggresning-ovning: Ryggresning, ryggresning
- kettlebell-swing: Kettlebell swing, kettlebell

### Kondition
- lopband-ovning: Löpband, lopband
- trappmaskin-ovning: Trappmaskin, trappmaskin
- crosstrainer-ovning: Crosstrainer, crosstrainer
- cykel-ovning: Cykel, cykel
- rodd-kondition: Roddmaskin, roddmaskin
