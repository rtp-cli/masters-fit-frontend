# Exercise Catalog Curation Candidates — PRODUCTION (Neon)

Generated 2026-07-08 directly against **production**, via the same `pg_trgm` self-join
technique as `EXERCISE_CURATION_CANDIDATES.md` — but that file is **local-only** (107-row
table). Production's `exercises` table has **2081 rows**, grown independently of local, and is
a fundamentally different, much messier dataset. Nothing was modified generating this —
read-only queries only.

## Root cause (why production has this and local doesn't)

```
2025-06-03   265 rows   original curated catalog
2025-07-08 1,535 rows   single-day bulk import — did not dedupe against the existing 276
 (78 more days, 2025-07-15 → 2026-06-22)   ~270 rows   gradual, via real generation traffic
```

The 2025-07-08 bulk batch is almost certainly the dominant source of the duplication below — a
one-time catalog-expansion job that added ~1,535 exercises without checking for existing
near-matches. That's a historical event, not an active bug spraying more duplicates every day.

That said, the **live** path (`exercise.service.ts`'s `createExerciseIfNotExists`, called during
real workout generation) still has a latent bug worth fixing separately: it does a
check-then-insert (`getExerciseByName` via `ILIKE '%name%'`, then insert if nothing found) with
**no DB-level unique constraint** backing it up (`idx_exercises_name` is a plain, non-unique
index — see `src/models/exercise.schema.ts`). Under this app's parallel fan-out generation
(multiple day-calls in flight at once), two concurrent calls introducing the same new exercise
name for the first time could both pass the "not found" check and both insert — a classic
TOCTOU race. Low-volume today (only ~270 rows added across the last year), but it compounds
over time and there's nothing stopping it from happening again. **Recommend**: add a unique
index on `lower(name)` once the existing duplicates below are cleaned up (the index can't be
added while dupes still exist), and consider wrapping the insert in `ON CONFLICT DO NOTHING`.

## Tier summary

| Tier | Pair count | Notes |
|---|---|---|
| Exact duplicate (case-insensitive) | 266 groups / **316 redundant rows** | Byte-identical names — highest confidence, safest to dedupe |
| Near-exact (≥0.95, formatting-only) | 44 pairs | Word order, hyphen/en-dash, apostrophe-style, "(Modified)" placement |
| High confidence (0.85–0.95) | 43 pairs | Mostly real dupes; **a few are false positives** (see caveats below) |
| Medium confidence (0.70–0.85) | 278 pairs | Not reviewed individually — false-positive rate climbs fast at this catalog size |
| Low confidence (0.50–0.70) | 1,937 pairs | Not reviewed — sharing words ≠ sharing an exercise; not worth hand-triaging at this volume |

The medium/low tiers aren't listed here — at 2,215 combined pairs, exhaustive manual review
isn't a good use of time without usage data to prioritize by (which exercises actually get
selected). Flagging as a real gap, same conclusion the local doc reached.

## Tier 1 — Exact duplicates (266 groups, 316 redundant rows)

Format: `name | ids (lowest = likely oldest/canonical) | count`. Sorted by count desc, then name.
Any dedup pass should keep one id per group (lowest is a reasonable default — it's usually the
original 2025-06-03 row) and reassign references (`plan_day_exercises.exercise_id`, and check for
any other FK) before deleting the rest.

| Name | IDs | Count |
|---|---|---|
| Stability Ball Wall Squat | 22,715,859,1142,1351,1550 | 6 |
| Bird Dog | 3,8,201,489,771 | 5 |
| Glute Bridge March | 21,518,1133,1747,1794 | 5 |
| Dead Bug | 2,1186,1289,1488 | 4 |
| Incline Push-Up | 605,1115,1350,1549 | 4 |
| Standing Oblique Crunch | 75,1092,1284,1483 | 4 |
| Alternating Dumbbell Snatch | 996,1309,1508 | 3 |
| Banded Good Morning | 534,609,1240 | 3 |
| Bear Crawl | 621,1286,1485 | 3 |
| Box Step-Up | 509,1285,1484 | 3 |
| Butt Kickers | 1002,1277,1476 | 3 |
| Chair Squat to Toe Raise | 31,1424,1623 | 3 |
| Cossack Squat | 570,1738,1764 | 3 |
| Forearm Plank | 266,1386,1585 | 3 |
| Glute Bridge | 764,1282,1481 | 3 |
| Goblet Squat | 507,597,1113 | 3 |
| Hand Release Push-Up | 631,1319,1518 | 3 |
| Kettlebell Swing | 508,586,962 | 3 |
| Marching Glute Bridge | 559,1313,1512 | 3 |
| Medicine Ball Slam | 514,1361,1560 | 3 |
| Modified Side Plank | 855,1394,1593 | 3 |
| Pigeon Pose | 212,1717,1763 | 3 |
| Push-Up to T | 566,1294,1493 | 3 |
| Seated Dumbbell Shoulder Press | 1118,1389,1588 | 3 |
| Shadow Boxing | 998,1297,1496 | 3 |
| Single-Leg Romanian Deadlift | 727,1301,1500 | 3 |
| Slam Ball Overhead Slam | 43,533,603 | 3 |
| Sled Push | 549,637,1218 | 3 |
| Staggered Push-Up | 582,1383,1582 | 3 |
| Standing Band Chest Fly | 1230,1449,1649 | 3 |
| Standing Band Chest Press | 828,1338,1537 | 3 |
| Standing Calf Raise | 1138,1307,1506 | 3 |
| Standing Hip Circles | 29,1750,1766 | 3 |
| Step-Up with Knee Drive | 1167,1300,1499 | 3 |
| Turkish Get-Up | 4,516,617 | 3 |
| Wall Angel | 561,1417,1616 | 3 |
| Wall Angels | 833,1727,1759 | 3 |
| Wall Marches | 1078,1390,1589 | 3 |
| Wall Push-Up | 1160,1342,1541 | 3 |
| Wrist Circles | 808,1726,1765 | 3 |
| Adductor Rock Back | 1746,1770 | 2 |
| Alternating Dumbbell Clean | 1340,1539 | 2 |
| Alternating Forward Step to Curtsy | 1362,1561 | 2 |
| Alternating Reverse Lunge | 1278,1477 | 2 |
| Alternating Step Down | 1346,1545 | 2 |
| Alternating Step-Up Knee Drive | 1314,1513 | 2 |
| Alternating Toe Touch Crunch | 1302,1501 | 2 |
| Ankle Alphabet | 785,1725 | 2 |
| Ankle Dorsiflexion Wall Stretch | 1714,1761 | 2 |
| Balance Heel-to-Toe Walk | 1416,1615 | 2 |
| Band Chest Press | 498,1156 | 2 |
| Band Pull Apart | 427,1146 | 2 |
| Barbell Clean Pull | 665,1263 | 2 |
| Barbell Front Rack Carry | 581,662 | 2 |
| Bench Hip Thrust | 1430,1629 | 2 |
| Bench Tap Burpee | 1316,1515 | 2 |
| Bench-Assisted Step Down | 1453,1653 | 2 |
| Bent-Knee Plank to Single-Arm Reach | 1356,1555 | 2 |
| Bird-Dog from Elbows | 1375,1574 | 2 |
| Bird-Dog from Hands | 1406,1605 | 2 |
| Bodyweight Broken Wall Sit | 1393,1592 | 2 |
| Bodyweight Good Morning | 1384,1583 | 2 |
| Box Highest Step-Up | 1442,1642 | 2 |
| Box Hop-Across | 1317,1516 | 2 |
| Box Tap Jack | 1324,1523 | 2 |
| Box Tap Lateral | 1407,1606 | 2 |
| Boxing Shuffle | 1306,1505 | 2 |
| Braced Core Knee Lift | 1420,1619 | 2 |
| Bridge with Chest Fly | 1380,1579 | 2 |
| Broomstick Overhead Squat | 1382,1581 | 2 |
| Burpee | 1276,1475 | 2 |
| Burpee Step Back | 1303,1502 | 2 |
| Cable Face Pull | 611,1137 | 2 |
| Calf Raise with Hold | 1328,1527 | 2 |
| Cat Cow Stretch | 1711,1751 | 2 |
| Chair Calf Raises | 1396,1595 | 2 |
| Chair Side Bend | 1412,1611 | 2 |
| Chair Sit-to-Stand with Arm Reach | 1339,1538 | 2 |
| Chair Squat | 1287,1486 | 2 |
| Chair-Assisted Calf Stretch | 1440,1640 | 2 |
| Chair-Assisted Side Kick | 1464,1664 | 2 |
| Chest Opener with Band | 1422,1621 | 2 |
| Chest Press on Stability Ball | 1470,1670 | 2 |
| Child's Pose | 198,1752 | 2 |
| Couch Assisted Nordic Curl | 1392,1591 | 2 |
| Decline Push-Up on Bench | 1355,1554 | 2 |
| Doorway Pec Stretch | 778,1828 | 2 |
| Dumbbell Chest Fly on Bench | 1368,1567 | 2 |
| Dumbbell Deadlift | 1295,1494 | 2 |
| Dumbbell Halo | 1345,1544 | 2 |
| Dumbbell Side Deadlift | 1358,1557 | 2 |
| Elevated Glute Bridge with Band | 1372,1571 | 2 |
| Farmer's Carry | 506,1122 | 2 |
| Foam Roller Calf Roll | 1745,1779 | 2 |
| Foam Roller Lat Roll | 1735,1777 | 2 |
| Foam Roller Wall Slide | 569,677 | 2 |
| Foot-Elevated Glute Bridge | 1413,1612 | 2 |
| Forward Arm Circles | 1421,1620 | 2 |
| Forward Lunge to Twist | 1333,1532 | 2 |
| Front Rack March with Band | 1401,1600 | 2 |
| Glute March on Stability Ball | 1400,1599 | 2 |
| Goblet Squat to Calf Raise | 1336,1535 | 2 |
| Half Kneeling Hamstring Curl to Stand | 1371,1570 | 2 |
| Half Kneeling Hip Flexor Stretch | 1712,1754 | 2 |
| Half-Kneeling Chop with Band | 1335,1534 | 2 |
| Half-Kneeling Overhead Band Reach | 1428,1627 | 2 |
| Heel Elevated Step-Up | 1322,1521 | 2 |
| Heel Slides | 763,1839 | 2 |
| Heel Touch | 1291,1490 | 2 |
| Heel-to-Toe Rocking | 144,939 | 2 |
| Heel-to-Toe Walk | 7,788 | 2 |
| High Knees | 1273,1472 | 2 |
| High Plank Hip Dips | 1364,1563 | 2 |
| High Plank Shoulder Tap | 1280,1479 | 2 |
| High-Plank Leg Lift | 1311,1510 | 2 |
| Hip Bridges with Dumbbell | 1457,1657 | 2 |
| Hip Cars | 1730,1760 | 2 |
| Hip Circles | 396,829 | 2 |
| Hip Circles in Squat | 1404,1603 | 2 |
| Inch Worm | 1304,1503 | 2 |
| Incline Band Chest Fly | 1410,1609 | 2 |
| Incline Band Upright Row | 1468,1668 | 2 |
| Incline Bird-Dog on Bench | 1448,1648 | 2 |
| Incline Reverse Plank | 1402,1601 | 2 |
| Jump Squat | 1272,1471 | 2 |
| Jumping Jack | 1292,1491 | 2 |
| Jumping Lunges | 691,1013 | 2 |
| Kettlebell Clean and Press | 638,1249 | 2 |
| Kettlebell Dead Swing | 1349,1548 | 2 |
| Kettlebell Deadlift | 532,1119 | 2 |
| Kettlebell Figure-Raise | 1447,1647 | 2 |
| Kettlebell Suitcase Deadlift | 568,1176 | 2 |
| Kettlebell Windmill | 685,1245 | 2 |
| Knee March to Toe Tap | 1318,1517 | 2 |
| Lateral Lunge | 1298,1497 | 2 |
| Lateral Shuffle to Squat | 1367,1566 | 2 |
| Low Step-Down w/ Pause | 1434,1633 | 2 |
| Lunge with Rotation | 68,556 | 2 |
| Marching Plank | 1332,1531 | 2 |
| Modified Plyo Box Jump | 1354,1553 | 2 |
| Mountain Climber | 1275,1474 | 2 |
| Neck Cars | 1749,1773 | 2 |
| Overhead Dumbbell Press | 1308,1507 | 2 |
| Overhead Squat | 548,589 | 2 |
| Pallof Press | 513,1129 | 2 |
| Plank Jack | 1274,1473 | 2 |
| Plank to Downward Dog | 1283,1482 | 2 |
| Plank to Push-Up | 524,654 | 2 |
| Prone Scapular Squeeze | 1370,1569 | 2 |
| Prone Superman | 1325,1524 | 2 |
| Prone Y Raise | 741,1184 | 2 |
| Push Press | 588,1163 | 2 |
| Quadruped Thoracic Rotation | 1715,1757 | 2 |
| Resistance Band Lateral Walks | 1352,1551 | 2 |
| Resistance Band Pull-Apart | 1299,1498 | 2 |
| Resistance Band Row and Step-Across | 1331,1530 | 2 |
| Resistance Band Squat to Overhead Press | 1344,1543 | 2 |
| Reverse Lunge Knee Drive | 538,1149 | 2 |
| Reverse Lunge to Knee Drive | 66,708 | 2 |
| Reverse Lunge with Overhead Reach | 1377,1576 | 2 |
| Reverse Lunge with Pass Through | 1365,1564 | 2 |
| Reverse Plank Leg Lift | 1357,1556 | 2 |
| Reverse Plank on Box | 1432,1631 | 2 |
| Reverse Snow Angel | 1334,1533 | 2 |
| Ring Row | 543,599 | 2 |
| Rowing Machine Row | 531,592 | 2 |
| Russian Twist | 1296,1495 | 2 |
| Scissor Jacks | 1363,1562 | 2 |
| Scissor Kicks | 1290,1489 | 2 |
| Scorpion Stretch | 1731,1791 | 2 |
| Seated Arm Punches | 1414,1613 | 2 |
| Seated Band Chest Press | 1427,1626 | 2 |
| Seated Band Hip Abduction | 1469,1669 | 2 |
| Seated Band Pallof Press | 1433,1632 | 2 |
| Seated Chest-Squeeze Fly | 1455,1655 | 2 |
| Seated Core Iso Hold | 1423,1622 | 2 |
| Seated Core Twist with Medicine Ball | 1374,1573 | 2 |
| Seated Figure 4 Stretch | 1718,1755 | 2 |
| Seated Knee Lift with Twist | 1385,1584 | 2 |
| Seated Knee-to-Chest | 1408,1607 | 2 |
| Seated Leg Abduction with Band | 1445,1645 | 2 |
| Seated Leg Extension to Tap | 1337,1536 | 2 |
| Seated Leg March with Resistance Band | 1378,1577 | 2 |
| Seated March + Band Row | 1437,1637 | 2 |
| Seated March with Arm Raise | 1366,1565 | 2 |
| Seated Overhead Band Reach | 1419,1618 | 2 |
| Seated Punch and Tap | 1327,1526 | 2 |
| Seated Resistance Band Leg Press | 1359,1558 | 2 |
| Seated Resistance Band Row | 1398,1597 | 2 |
| Seated Side-Bend with Band | 1450,1650 | 2 |
| Seated Tricep Extension | 1399,1598 | 2 |
| Shoulder Cars | 1733,1774 | 2 |
| Side Plank with Reach | 1305,1504 | 2 |
| Side Shuffle and Reach | 1329,1528 | 2 |
| Side Step Squat | 1323,1522 | 2 |
| Side Step with Band Pull | 1373,1572 | 2 |
| Side-Lying Leg Lift on Floor | 1403,1602 | 2 |
| Side-to-Side Skater | 1279,1478 | 2 |
| Single-Arm Bent Over Row | 1348,1547 | 2 |
| Single-Leg Balance Tap | 1353,1552 | 2 |
| Single-Leg Toe Tap on Box | 1444,1644 | 2 |
| Single-Arm Band Row Standing | 1456,1656 | 2 |
| Single-Leg Glute Bridge on Floor | 1462,1662 | 2 |
| Skater Step | 1310,1509 | 2 |
| Slim Jog in Place | 1467,1667 | 2 |
| Slow Mountain Climber | 1320,1519 | 2 |
| Speed Skips | 1281,1480 | 2 |
| Spinal Wave | 1723,1762 | 2 |
| Squat Pulse | 1293,1492 | 2 |
| Squat to High Knee | 1315,1514 | 2 |
| Stability Ball Deadbug | 1460,1660 | 2 |
| Stability Ball Wall Roll-Out | 1451,1651 | 2 |
| Standing Arm Circles | 1395,1594 | 2 |
| Standing Band External Rotation | 1458,1658 | 2 |
| Standing Band Face Pull | 1461,1661 | 2 |
| Standing Band Front Squat | 1443,1643 | 2 |
| Standing Band Glute Kickback | 1466,1666 | 2 |
| Standing Band Good Morning | 1411,1610 | 2 |
| Standing Band Hip Extension | 1436,1636 | 2 |
| Standing Band Lateral Raise | 1441,1641 | 2 |
| Standing Band Pull-Through | 1454,1654 | 2 |
| Standing Band Reverse Fly | 1431,1630 | 2 |
| Standing Band Shrug | 1452,1652 | 2 |
| Standing Bent-Knee Back Kick | 1397,1596 | 2 |
| Standing Bicycle Crunch | 1326,1525 | 2 |
| Standing Calf Raise with Resistance Band | 1381,1580 | 2 |
| Standing Cross-Curl to Shoulder Press | 1446,1646 | 2 |
| Standing Hamstring Curl | 47,775 | 2 |
| Standing Heel Raises | 35,767 | 2 |
| Standing Hip Abduction with Band | 1391,1590 | 2 |
| Standing Hip Flexor March | 1343,1542 | 2 |
| Standing March a Low-Impact Heart-Rate Raiser | 1288,1487 | 2 |
| Standing March with Band Pull | 1405,1604 | 2 |
| Standing March with Bicep Curl | 1463,1663 | 2 |
| Standing Oblique Band Twist | 1379,1578 | 2 |
| Standing Pallof Press with Band | 1347,1546 | 2 |
| Standing Quad Stretch | 881,1797 | 2 |
| Standing Rear Kick w/ Dumbbell | 1435,1634 | 2 |
| Standing Resistance Band Hip Kick | 1409,1608 | 2 |
| Standing Resistance Band Shoulder Press | 1369,1568 | 2 |
| Standing Single-Arm Band Row | 1387,1586 | 2 |
| Standing Single-Leg Deadlift w/ Band | 1429,1628 | 2 |
| Standing T-Friendly Stretch | 1439,1639 | 2 |
| Standing T-Spine Rotation | 1360,1559 | 2 |
| Standing Towel Row | 1415,1614 | 2 |
| Static Lunge Hold | 1418,1617 | 2 |
| Stationary Bike Sprint | 1341,1540 | 2 |
| Step Back Lunge to Knee Drive | 1312,1511 | 2 |
| Step Back Squat | 1321,1520 | 2 |
| Step Touch with Arm Raise | 1388,1587 | 2 |
| Step-Up to Knee Drive | 564,646 | 2 |
| Step-Up with Bicep Curl | 1376,1575 | 2 |
| Step-Back Curtsy Lunge | 1426,1625 | 2 |
| Step-Up + Band Row | 1459,1659 | 2 |
| Suitcase Carry | 525,1134 | 2 |
| Thread the Needle | 256,1753 | 2 |
| Tree Pose | 12,207 | 2 |
| Wall Calf Stretch | 303,776 | 2 |
| Wall Chest Stretch | 1425,1624 | 2 |
| Wall March + Band Chest Pull | 1438,1638 | 2 |
| Wall Reverse Fly | 1465,1665 | 2 |
| Wall Sit March | 184,676 | 2 |
| Wall Sit with Alternating Heel Raise | 1330,1529 | 2 |
| Wall Slides | 765,1720 | 2 |
| Warrior III | 34,205 | 2 |
| Wrist Flexor Stretch | 791,1786 | 2 |

(Names above are capitalized for readability — the query grouped case-insensitively, so actual
stored casing may vary slightly between rows in a group.)

## Tier 2 — Near-exact, formatting-only differences (44 pairs)

These are different strings but the same exercise — word order, hyphen vs. en-dash, apostrophe
style, or "(Modified)" as prefix vs. suffix. All look like genuine duplicates.

| ID 1 | Name 1 | ID 2 | Name 2 |
|---|---|---|---|
| 2007 | Standing Gentle Spinal Twist | 2008 | Gentle Standing Spinal Twist |
| 1456 | Single-Arm Band Row Standing | 1586 | Standing Single-Arm Band Row |
| 2071 | Push-Ups (Standard) | 2106 | Standard Push-Ups |
| 221 | Side Plank (Modified) | 855, 1394, 1593 | Modified Side Plank |
| 290 | Neck Side Stretch | 809 | Side Neck Stretch |
| 197 | Cat–Cow Stretch | 1711, 1751 | Cat Cow Stretch |
| 197 | Cat–Cow Stretch | 2030 | Cat-Cow Stretch |
| 199 | Downward-Facing Dog | 2074 | Downward Facing Dog |
| 1711 | Cat Cow Stretch | 2030 | Cat-Cow Stretch |
| 1713 | Banded Shoulder Pass Through | 1758 | Banded Shoulder Pass-Through |
| 18 | Stability Ball V Pass | 705 | Stability Ball V-Pass |
| 33 | Single-Leg Glute Bridge | 1187 | Single Leg Glute Bridge |
| 87 | Half Kneeling Pallof Press | 542 | Half-Kneeling Pallof Press |
| 427 | Band Pull Apart | 602 | Band Pull-Apart |
| 470 | Criss-Cross | 2078 | Criss Cross |
| 530 | Stability-Ball Hamstring Curl | 783, 1125 | Hamstring Curl Stability Ball / Stability Ball Hamstring Curl |
| 575 | Stability Ball Stir the Pot | 682 | Stability Ball Stir-the-Pot |
| 640 | Band-Assisted Pull-Up | 1151 | Assisted Band Pull-Up |
| 729 | Kettlebell Figure-8 | 1635 | Kettlebell Figure‑8 (non-breaking hyphen) |
| 734 | Dumbbell Z-Press | 1159 | Dumbbell Z Press |
| 795 | Seated Cat-Cow | 1841 | Seated Cat Cow |
| 813 | Lateral Band Walks | 975 | Band Lateral Walks |
| 960 | Jump Rope Single Unders | 2036 | Jump Rope - Single Unders |
| 996, 1309, 1508 | Alternating Dumbbell Snatch | 2088 | Dumbbell Snatch (Alternating) |
| 1040 | Standing Elbow-to-Knee Cross | 2006 | Standing Knee-to-Elbow Cross |
| 1387, 1586 | Standing Single-Arm Band Row | 1456, 1656 | Single-Arm Band Row Standing |
| 1742 | Foam Roller IT Band Roll | 1778 | Foam Roller IT-Band Roll |
| 1743 | Hamstring Sweep Dynamic | 1787 | Dynamic Hamstring Sweep |
| 1744 | 90 90 Hip Switch | 1793 | 90/90 Hip Switch |
| 1771 | World's Greatest Stretch (curly apostrophe) | 2031 | World's Greatest Stretch (straight apostrophe) |
| 1796 | Doorway Chest Stretch | 2055 | Chest Doorway Stretch |
| 1951 | Wall-Supported Single-Leg Balance | 2004 | Wall-Supported Single Leg Balance |
| 1995 | Incline Driveway Run | 2016 | Driveway Incline Run |

## Tier 3 — High confidence (0.85–0.95, 43 pairs) — includes some false positives

**Real duplicates** (plural/singular, minor phrasing):
Balance Pad Single-Leg Stance/Stand · Kettlebell Deadlift to/High Pull variants · Seated
(Leg) March with Resistance Band · Heel Raise(s) to Knee Drive · Reverse Lunge (to) Knee Drive
(3-way cluster: ids 66, 538, 708, 1149) · Single-Leg Balance with Arm Reach(es) · Slow Mountain
Climber(s) · Overhead Tricep(s) Stretch · Foam Roller/Thoracic Extension word order · Hip Flexor
Stretch Kneeling / Half Kneeling Hip Flexor Stretch · Farmer's/Farmer Carry · Bulgarian Split
Squat(s) · Medicine Ball Slam(s) · Reverse Snow Angel(s) · (Wall-)Supported Standing Hip Circles
· Side-Lying Leg Lift(s) · Lateral Band Walk(s) · Dumbbell Thruster(s) · Kettlebell Sumo Deadlift
High Pull / Kettlebell Deadlift High Pull.

**False positives — do NOT merge:**
- **"Barbell Bench Press - Warm-up Set 1/2/3"**, **"Barbell Deadlift - Warm-up Set 1/2/3"**,
  **"Barbell Bench Press - Drop Set 1/2/3"**, **"Barbell Deadlift - Drop Set 1/2/3"** — these are
  intentionally distinct progression-set labels within a session, not duplicate exercises. Their
  high similarity score is an artifact of sharing almost the entire string except the trailing
  number.
- **"Warrior III"** vs. **"Warrior II"** — different yoga poses (same false-positive pattern
  already flagged in the local doc).

## Recommendation

1. **Fix the growth vector first**: add a unique index on `lower(name)` (after dedup below, since
   Postgres won't let you add it while duplicates exist) and change `createExerciseIfNotExists`
   to rely on that constraint (e.g. `ON CONFLICT DO NOTHING`) instead of trusting the
   check-then-insert alone.
2. **Dedup Tier 1 + Tier 2** (the two tiers above with no meaningful false-positive risk): for each
   group, keep one canonical id (lowest is a reasonable default), reassign
   `plan_day_exercises.exercise_id` (and audit for any other FK referencing `exercises.id`) to the
   canonical id, then delete the rest. This is a real prod data migration — needs its own careful,
   reviewed script, not a quick one-liner, given the FK reassignment step.
3. **Tier 3**: hand-review the ~40 pairs (list above already separates likely-real from
   known-false-positives) before merging.
4. **Tiers 4/5 (medium/low confidence, 2,215 pairs)**: leave alone without usage data to prioritize
   by — see the local doc's identical conclusion.
