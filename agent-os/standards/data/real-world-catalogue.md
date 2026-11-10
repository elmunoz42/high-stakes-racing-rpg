# Real-world car and parts catalogue

The promise to players is real cars, real parts, real prices. That only holds
if every number can be traced.

- **Never enter specs or prices from memory.** Look each one up and record
  where it came from. If a figure cannot be sourced, leave the record out.
- **Required fields, cars:** `id`, `make`, `model`, `generation`, `year`,
  `drivetrain`, `power_hp`, `torque_nm`, `weight_kg`, `price_usd` (a typical
  used market price for the game economy, labelled as such), `source_url`,
  `checked_on` (ISO date).
- **Required fields, parts:** `id`, `brand`, `name`, `part_number`, `category`
  (tyres, suspension, intake, exhaust, brakes, ...), `fits` (car ids),
  `price_usd` (manufacturer list price or a named retailer's listed price),
  `price_basis` (`msrp` or `retailer`), `source_url`, `checked_on`, and
  `effects` (the game stat changes).
- **`effects` are game design, not facts.** Derive them from documented rules
  in `src/rpg/` (for example a tyre's grip rating from its category), and keep
  them clearly separate from the sourced fields.
- **Zod validates the whole catalogue** in a unit test: required fields,
  https `source_url`, `checked_on` not in the future, `fits` pointing at real
  car ids, positive prices.
- **Prices age.** Show "price checked <date>" in the shop UI. A catalogue
  refresh is a normal maintenance task; never silently change a price without
  updating `checked_on` and `source_url`.
- **Names as facts only.** Make, model, brand and part names appear as plain
  text. No logos, badges, liveries, product photos or marketing copy copied
  from manufacturers or retailers. Descriptions are written fresh.
- **Fiction stays fictional.** Sponsors, teams, shops and people are invented.
  Do not put words in the mouth of a real company or person.
