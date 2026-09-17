-- PureSip seed data. Run with:
--   npm run db:seed        (local)      npm run db:seed:remote   (production)
-- Prices in USD. Accessories have no size (size_ml = 0).

-- ── Products ────────────────────────────────────────────────────────────────
INSERT INTO products (id, slug, name, category, short_description, long_description, base_price, featured, active) VALUES
(1, 'puresip-bottle-500ml', 'PureSip Bottle 500ml', 'bottles',
 'The everyday icon. Double-wall insulated, leak-proof, and feather-light — hydration that keeps up with you.',
 'The PureSip 500ml is the bottle we built everything else around. Vacuum-insulated 18/8 stainless steel keeps water glacier-cold for 24 hours, while the textured powder coat gives you a confident grip — wet hands, gym chalk, bike bars, all of it. The leak-proof twist lid seals with a quarter turn, and at 279 g you will forget it is in your bag until you need it. Fits standard cup holders, comes in six colors, and cleans up in seconds with the PureSip Brush Kit.',
 24.99, 1, 1),
(2, 'puresip-bottle-750ml', 'PureSip Bottle 750ml', 'bottles',
 'Our large-capacity hero. Same insulation, 50% more water — built for long days, long rides, and long meetings.',
 'When one fill should last the whole afternoon, reach for the 750ml. Identical double-wall vacuum construction to the 500ml — 24 hours cold — with a wider 63 mm mouth that takes ice cubes whole. The taller body still clears most cup holders, and the silicone base bumper keeps it quiet on desks. 402 g empty; lighter than your laptop and far more useful by 3 pm.',
 29.99, 1, 1),
(3, 'puresip-tumbler-400ml', 'PureSip Tumbler 400ml', 'tumblers',
 'A coffee tumbler that behaves like your favorite mug — sip lid, no sweat, fits every cup holder we have met.',
 'The 400ml Tumbler is pureSip for hot hours. The ceramic-coated interior never taints your flat white, the sip-through lid controls flow for drinkable-from-the-desk sipping, and the double wall keeps the outside at room temperature — no rings on your notebook. Slips into every cup holder we have tested and comes in the full six-color lineup so it can match your bottle.',
 22.99, 1, 1),
(4, 'puresip-straw-lid', 'PureSip Straw Lid', 'accessories',
 'Swap any PureSip bottle to sip mode. Includes straw, gasket, and spare seals.',
 'Turn your 500ml or 750ml Bottle into a one-hand sipper. The Straw Lid screws onto the existing threads, seals with a food-grade silicone gasket, and includes a cut-to-fit straw, two spare seals, and a splash-resistant flip closure. Dishwasher-safe on the top rack.',
 9.99, 0, 1),
(5, 'puresip-carry-loop', 'PureSip Carry Loop', 'accessories',
 'Silicone carry loop that clips to any PureSip bottle. Choose your color.',
 'A soft-touch silicone loop that clips around the bottle neck and stays put. Comfortable in two fingers, tough enough to hang from a hook or carabiner, and it comes off in a second when you do not want it. Fits all PureSip bottles and tumblers.',
 6.99, 0, 1),
(6, 'puresip-brush-kit', 'PureSip Brush Kit', 'accessories',
 'Three-brush cleaning set sized for PureSip bottles, lids, and straws.',
 'Everything you need to keep a PureSip fresh: a long-handle bottle brush with a soft non-scratch tip, a lid-detail brush for the threads and gasket grooves, and a slim straw brush that goes all the way through. Nylon bristles, stainless handles, hang-to-dry loops.',
 11.99, 0, 1),
(7, 'puresip-sports-cap', 'PureSip Sports Cap', 'accessories',
 'One-hand flip cap with high-flow spout. Locks shut, stays shut.',
 'The Sports Cap replaces the standard lid on any PureSip Bottle. A high-flow spout comes up with a flick of the thumb, locks down with an audible click, and will not leak in a bag. The spout is soft-edged for comfortable drinking and the whole cap is top-rack dishwasher-safe.',
 8.99, 0, 1),
(8, 'puresip-mini-350ml', 'PureSip Mini 350ml', 'bottles',
 'Pocket size for small hands, small bags, and espresso-length errands.',
 'The Mini is 350ml of full-size PureSip engineering: same steel, same insulation, same quarter-turn lid, scaled for kids, coat pockets, and minimalists. 212 g, six colors, and the same leak-proof promise.',
 19.99, 0, 1);

-- ── Variants (6 colors for bottles/tumbler, 3 for accessories) ─────────────
INSERT INTO product_variants (id, product_id, sku, color, color_hex, size_ml, price_delta, stock, image_urls) VALUES
-- 500ml Bottle
(1, 1, 'PS-B500-OCE', 'Ocean Teal', '#0E7C7B', 500, 0, 142, '["/images/bottle-500-ocean-1.svg","/images/bottle-500-ocean-2.svg","/images/bottle-500-ocean-3.svg"]'),
(2, 1, 'PS-B500-GLA', 'Glacier Blue', '#4FA3D9', 500, 0, 96, '["/images/bottle-500-glacier-1.svg","/images/bottle-500-glacier-2.svg","/images/bottle-500-glacier-3.svg"]'),
(3, 1, 'PS-B500-SAN', 'Sandstone', '#D9C7A7', 500, 0, 88, '["/images/bottle-500-sand-1.svg","/images/bottle-500-sand-2.svg","/images/bottle-500-sand-3.svg"]'),
(4, 1, 'PS-B500-CHS', 'Charcoal', '#37424C', 500, 0, 110, '["/images/bottle-500-charcoal-1.svg","/images/bottle-500-charcoal-2.svg","/images/bottle-500-charcoal-3.svg"]'),
(5, 1, 'PS-B500-ROS', 'Rosewood', '#C98A8E', 500, 0, 74, '["/images/bottle-500-rose-1.svg","/images/bottle-500-rose-2.svg","/images/bottle-500-rose-3.svg"]'),
(6, 1, 'PS-B500-MOS', 'Moss', '#7C9A6D', 500, 0, 65, '["/images/bottle-500-moss-1.svg","/images/bottle-500-moss-2.svg","/images/bottle-500-moss-3.svg"]'),
-- 750ml Bottle
(7, 2, 'PS-B750-OCE', 'Ocean Teal', '#0E7C7B', 750, 0, 121, '["/images/bottle-750-ocean-1.svg","/images/bottle-750-ocean-2.svg","/images/bottle-750-ocean-3.svg"]'),
(8, 2, 'PS-B750-GLA', 'Glacier Blue', '#4FA3D9', 750, 0, 77, '["/images/bottle-750-glacier-1.svg","/images/bottle-750-glacier-2.svg","/images/bottle-750-glacier-3.svg"]'),
(9, 2, 'PS-B750-SAN', 'Sandstone', '#D9C7A7', 750, 0, 69, '["/images/bottle-750-sand-1.svg","/images/bottle-750-sand-2.svg","/images/bottle-750-sand-3.svg"]'),
(10, 2, 'PS-B750-CHS', 'Charcoal', '#37424C', 750, 0, 90, '["/images/bottle-750-charcoal-1.svg","/images/bottle-750-charcoal-2.svg","/images/bottle-750-charcoal-3.svg"]'),
(11, 2, 'PS-B750-ROS', 'Rosewood', '#C98A8E', 750, 0, 58, '["/images/bottle-750-rose-1.svg","/images/bottle-750-rose-2.svg","/images/bottle-750-rose-3.svg"]'),
(12, 2, 'PS-B750-MOS', 'Moss', '#7C9A6D', 750, 0, 52, '["/images/bottle-750-moss-1.svg","/images/bottle-750-moss-2.svg","/images/bottle-750-moss-3.svg"]'),
-- 400ml Tumbler
(13, 3, 'PS-T400-OCE', 'Ocean Teal', '#0E7C7B', 400, 0, 84, '["/images/tumbler-400-ocean-1.svg","/images/tumbler-400-ocean-2.svg","/images/tumbler-400-ocean-3.svg"]'),
(14, 3, 'PS-T400-GLA', 'Glacier Blue', '#4FA3D9', 400, 0, 66, '["/images/tumbler-400-glacier-1.svg","/images/tumbler-400-glacier-2.svg","/images/tumbler-400-glacier-3.svg"]'),
(15, 3, 'PS-T400-SAN', 'Sandstone', '#D9C7A7', 400, 0, 59, '["/images/tumbler-400-sand-1.svg","/images/tumbler-400-sand-2.svg","/images/tumbler-400-sand-3.svg"]'),
(16, 3, 'PS-T400-CHS', 'Charcoal', '#37424C', 400, 0, 71, '["/images/tumbler-400-charcoal-1.svg","/images/tumbler-400-charcoal-2.svg","/images/tumbler-400-charcoal-3.svg"]'),
(17, 3, 'PS-T400-ROS', 'Rosewood', '#C98A8E', 400, 0, 47, '["/images/tumbler-400-rose-1.svg","/images/tumbler-400-rose-2.svg","/images/tumbler-400-rose-3.svg"]'),
(18, 3, 'PS-T400-MOS', 'Moss', '#7C9A6D', 400, 0, 41, '["/images/tumbler-400-moss-1.svg","/images/tumbler-400-moss-2.svg","/images/tumbler-400-moss-3.svg"]'),
-- Accessories (3 colors each)
(19, 4, 'PS-ACC-SLW', 'Ocean Teal', '#0E7C7B', 0, 0, 130, '["/images/straw-lid-teal-1.svg","/images/straw-lid-teal-2.svg"]'),
(20, 4, 'PS-ACC-SLC', 'Charcoal', '#37424C', 0, 0, 98, '["/images/straw-lid-charcoal-1.svg","/images/straw-lid-charcoal-2.svg"]'),
(21, 4, 'PS-ACC-SLG', 'Glacier Blue', '#4FA3D9', 0, 0, 87, '["/images/straw-lid-glacier-1.svg","/images/straw-lid-glacier-2.svg"]'),
(22, 5, 'PS-ACC-CLW', 'Ocean Teal', '#0E7C7B', 0, 0, 150, '["/images/carry-loop-teal-1.svg","/images/carry-loop-teal-2.svg"]'),
(23, 5, 'PS-ACC-CLC', 'Charcoal', '#37424C', 0, 0, 120, '["/images/carry-loop-charcoal-1.svg","/images/carry-loop-charcoal-2.svg"]'),
(24, 5, 'PS-ACC-CLR', 'Rosewood', '#C98A8E', 0, 0, 95, '["/images/carry-loop-rose-1.svg","/images/carry-loop-rose-2.svg"]'),
(25, 6, 'PS-ACC-BKW', 'Ocean Teal', '#0E7C7B', 0, 0, 76, '["/images/brush-kit-teal-1.svg","/images/brush-kit-teal-2.svg"]'),
(26, 6, 'PS-ACC-BKC', 'Charcoal', '#37424C', 0, 0, 64, '["/images/brush-kit-charcoal-1.svg","/images/brush-kit-charcoal-2.svg"]'),
(27, 6, 'PS-ACC-BKG', 'Glacier Blue', '#4FA3D9', 0, 0, 55, '["/images/brush-kit-glacier-1.svg","/images/brush-kit-glacier-2.svg"]'),
(28, 7, 'PS-ACC-SCW', 'Ocean Teal', '#0E7C7B', 0, 0, 112, '["/images/sports-cap-teal-1.svg","/images/sports-cap-teal-2.svg"]'),
(29, 7, 'PS-ACC-SCC', 'Charcoal', '#37424C', 0, 0, 89, '["/images/sports-cap-charcoal-1.svg","/images/sports-cap-charcoal-2.svg"]'),
(30, 7, 'PS-ACC-SCS', 'Sandstone', '#D9C7A7', 0, 0, 73, '["/images/sports-cap-sand-1.svg","/images/sports-cap-sand-2.svg"]'),
-- Mini 350ml
(31, 8, 'PS-M350-OCE', 'Ocean Teal', '#0E7C7B', 350, 0, 90, '["/images/mini-350-ocean-1.svg","/images/mini-350-ocean-2.svg","/images/mini-350-ocean-3.svg"]'),
(32, 8, 'PS-M350-GLA', 'Glacier Blue', '#4FA3D9', 350, 0, 70, '["/images/mini-350-glacier-1.svg","/images/mini-350-glacier-2.svg","/images/mini-350-glacier-3.svg"]'),
(33, 8, 'PS-M350-SAN', 'Sandstone', '#D9C7A7', 350, 0, 62, '["/images/mini-350-sand-1.svg","/images/mini-350-sand-2.svg","/images/mini-350-sand-3.svg"]'),
(34, 8, 'PS-M350-CHS', 'Charcoal', '#37424C', 350, 0, 80, '["/images/mini-350-charcoal-1.svg","/images/mini-350-charcoal-2.svg","/images/mini-350-charcoal-3.svg"]'),
(35, 8, 'PS-M350-ROS', 'Rosewood', '#C98A8E', 350, 0, 55, '["/images/mini-350-rose-1.svg","/images/mini-350-rose-2.svg","/images/mini-350-rose-3.svg"]'),
(36, 8, 'PS-M350-MOS', 'Moss', '#7C9A6D', 350, 0, 48, '["/images/mini-350-moss-1.svg","/images/mini-350-moss-2.svg","/images/mini-350-moss-3.svg"]');

-- ── Reviews (2–3 per product) ───────────────────────────────────────────────
INSERT INTO reviews (id, product_id, rating, title, body, author_name, approved, created_at) VALUES
(1, 1, 5, 'Never warm, never leaks', 'I throw this in my backpack sideways and it has never once leaked. Ice from 7 am was still clinking at 4 pm.', 'Maya R.', 1, '2026-07-14 10:00:00'),
(2, 1, 5, 'The powder coat is the thing', 'Grippy even with sweaty hands at the gym. The Ocean Teal color looks better in person.', 'Daniel K.', 1, '2026-08-02 10:00:00'),
(3, 1, 4, 'Great bottle, wish it were wider', 'Takes standard ice cubes fine but big ones need a crush first. Otherwise perfect.', 'Priya S.', 1, '2026-08-19 10:00:00'),
(4, 2, 5, 'One fill lasts my whole shift', 'Nurse here — 12-hour shifts and the 750 goes the distance. Still cold at the end.', 'Elena V.', 1, '2026-07-21 10:00:00'),
(5, 2, 5, 'Fits my cup holder', 'I expected it to be too tall for the car. It is not. Bought two more.', 'Tom H.', 1, '2026-08-11 10:00:00'),
(6, 3, 5, 'No more coffee rings', 'The outside really is room temperature all the way down. My notebooks approve.', 'Sofia L.', 1, '2026-07-30 10:00:00'),
(7, 3, 4, 'Lid takes a rinse first', 'Occasionally a drop sits in the sip lid — a quick rinse and it is fine.', 'Marcus B.', 1, '2026-08-25 10:00:00'),
(8, 4, 5, 'Best upgrade', 'Turns the bottle into a gym bottle. Straw was easy to cut to size.', 'Ashley N.', 1, '2026-08-05 10:00:00'),
(9, 5, 4, 'Simple and it works', 'Clips on tight and has not popped off once. Would like a wider strap option.', 'Chris D.', 1, '2026-08-14 10:00:00'),
(10, 6, 5, 'Actually gets into the corners', 'The lid brush is the star — gets the gasket groove clean in seconds.', 'Jana W.', 1, '2026-07-18 10:00:00'),
(11, 7, 5, 'Clicks shut, stays shut', 'Thrown in a gym bag daily for two months. Zero leaks. The lock is satisfying.', 'Leo P.', 1, '2026-08-21 10:00:00'),
(12, 8, 5, 'Perfect for the kids', 'Small hands, fits lunchbox pockets, and survives being dropped on tile.', 'Nadia F.', 1, '2026-08-08 10:00:00');

-- ── Promo code ──────────────────────────────────────────────────────────────
INSERT INTO promo_codes (code, type, value, active, expires_at) VALUES
('PURE10', 'percent', 10, 1, '2027-12-31 23:59:59');

-- ── Newsletter demo rows (optional; keeps admin table non-empty) ───────────
INSERT INTO newsletter_subscribers (email) VALUES
('hello@puresip.example');

UPDATE sqlite_sequence SET seq = 12 WHERE name = 'reviews' AND seq < 12;
