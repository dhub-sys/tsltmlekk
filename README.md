# Modern Timeline – Joomla module

Μοντέρνο, responsive **χρονολόγιο (timeline)** για Joomla 6 (και 4.4 / 5.x), σχεδιασμένο ώστε να δένει με ιστοσελίδες **YOOtheme Pro**.

- **Οριζόντιο** χρονολόγιο με **κύλιση στο επόμενο** όταν δεν χωράνε όλα τα γεγονότα: βέλη, μπάρα προόδου, μετρητής (03 / 12), swipe στο κινητό, σύρσιμο με το ποντίκι, πλήκτρα ← → Home End, προαιρετική αυτόματη κύλιση.
  Τα βέλη εμφανίζονται **μόνο όταν χρειάζεται**.
- **Κάθετο** χρονολόγιο με εναλλαγή αριστερά/δεξιά και προαιρετικό κουμπί «Εμφάνιση περισσότερων».
- Κάρτες σε 4 στυλ (γυαλί, συμπαγής, περίγραμμα, μινιμαλ), εικόνα, υπότιτλος, κείμενο με editor, σύνδεσμος.
- Δείκτες με **εικονίδια UIkit** (τα φορτώνει ήδη το YOOtheme), αριθμούς ή τελείες.
- Δύο χρώματα με διαβάθμιση, χρώμα ανά γεγονός, «έμφαση» σε γεγονός.
- **Αυτόματο σκούρο στυλ** μέσα σε YOOtheme sections με ανοιχτόχρωμο (inverse / `uk-light`) κείμενο.
- Κληρονομεί τις γραμματοσειρές του template. Χωρίς jQuery και χωρίς εξαρτήσεις.
- Προσβασιμότητα: σημασιολογική λίστα `<ol>`, aria-labels, πλοήγηση με πληκτρολόγιο, σεβασμός του `prefers-reduced-motion`.

## Εγκατάσταση

1. Κατεβάστε το `dist/mod_modern_timeline-1.0.0.zip` (ή φτιάξτε το με `./build.sh`).
2. Joomla admin → **System → Install → Extensions** → ανεβάστε το zip.
3. **Content → Site Modules → New → Modern Timeline**.
4. Στην καρτέλα **Module** προσθέστε γεγονότα (κουμπί +). Στις καρτέλες **Διάταξη**, **Κύλιση** και **Εμφάνιση** ρυθμίζετε το στυλ.
5. Βάλτε το module σε θέση (position) και σελίδες (Menu Assignment) και αποθηκεύστε.

## Χρήση με YOOtheme Pro

**Τρόπος Α: μέσα στον Page Builder (προτείνεται)**
1. Δημοσιεύστε το module σε οποιαδήποτε θέση, π.χ. `builder-1`, ή χωρίς θέση με assignment «On all pages».
2. Στον YOOtheme Builder προσθέστε το element **Joomla Module** (ή **Joomla Position** για όλη τη θέση) και επιλέξτε το «Modern Timeline».
3. Αν το section έχει σκούρο φόντο με ανοιχτόχρωμο κείμενο (Text color: Light), το timeline περνά αυτόματα σε σκούρο στυλ, εφόσον το «Χρωματικό σχήμα» είναι «Αυτόματο».

**Τρόπος Β:** Θέση module του YOOtheme (π.χ. `top`, `bottom`) από τον Customizer → Layout.

> Για full-width εμφάνιση του οριζόντιου timeline, βάλτε το σε section με container «Expand» ή «Large».

## Παραμετροποίηση εμφάνισης

**Template override:** αντιγράψτε το `tmpl/default.php` στο
`templates/yootheme/html/mod_modern_timeline/default.php` (ή στον φάκελο του child theme).

**CSS μεταβλητές:** μπορείτε να τις αλλάξετε στο *YOOtheme → Settings → Custom Code → CSS*:

```css
.mtl {
    --mtl-card-w: 340px;     /* πλάτος κάρτας (οριζόντιο) */
    --mtl-gap: 32px;         /* απόσταση γεγονότων */
    --mtl-radius: 12px;      /* στρογγύλεμα */
    --mtl-marker: 46px;      /* μέγεθος δείκτη */
    --mtl-pad: 24px;         /* εσωτερικό περιθώριο κάρτας */
}
```

**JavaScript:** αν το timeline φορτώνεται δυναμικά (π.χ. σε modal), καλέστε `ModernTimeline.init(container)`.

## Εικονίδια

Γράψτε το όνομα ενός εικονιδίου του UIkit στο πεδίο «Εικονίδιο», π.χ. `star`, `heart`, `home`, `location`, `world`, `calendar`, `bolt`, `users`, `cart`, `trophy` (YOOtheme), `bag`, `camera`. Λίστα: https://getuikit.com/docs/icon

## Δομή

```
mod_modern_timeline/
├── mod_modern_timeline.xml      manifest + όλες οι ρυθμίσεις
├── services/provider.php        DI service provider (Joomla 4.4+/5/6)
├── src/Dispatcher/Dispatcher.php
├── src/Helper/TimelineHelper.php
├── tmpl/default.php             HTML (υποστηρίζει template overrides)
├── language/{en-GB,el-GR}/
└── media/                       → /media/mod_modern_timeline
    ├── joomla.asset.json        Web Asset Manager
    ├── css/timeline.css
    └── js/timeline.js
```

Άδεια: GNU GPL v2 ή νεότερη.
