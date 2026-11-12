# Anchors

Candidate pointing targets for each demo screen, in 1920x1080 coordinates
(top-left origin). Measured from the rendered page by
`scripts/render-screens.mjs` (`getBoundingClientRect`), so re-run it after
editing a screen. Generated file: edit the `data-anchor` attributes in the
HTML instead of this table.

- **Rect**: `x, y, w, h` of the element.
- **Edge**: the midpoint of the chosen side, where a line touches the element.
- **Gutter**: a point 18px outside that edge in empty space. No text
  node lies on the segment from gutter to edge, so a line can land there
  without crossing text.
- **Free run**: how many px beyond the gutter, in the same direction, are still
  free of text (capped at 240). Use it to decide how long an approach
  segment can be.

The same names recur on every screen for the thread's carried values:
`object` (Order #1042), `amount` ($212.54), `customer` (Mara Okafor),
`status`, `primary-action`, `timeline`.

## analytics

| Anchor | Content | Rect (x, y, w, h) | Side | Edge | Gutter | Free run |
|---|---|---|---|---|---|---|
| `chart` | Daily revenue / USD, net of refunds / $0 / $400  | 296, 327, 995, 328 | left | (296, 491) | (278, 491) | 240 |
| `order-point` | #1042 / Mara Okafor / $212.54 / Paid Nov 12, 09: | 1051, 397, 200, 83 | left | (1051, 439) | (1033, 439) | 240 |
| `amount` | $212.54 | 1066, 426, 170, 26 | left | (1066, 440) | (1048, 440) | 240 |
| `top-product` | Linen Throw, Moss / FW-TX-201 / 41	$3,444.00 | 297, 781, 993, 58 | left | (297, 810) | (279, 810) | 240 |
| `categories` | Revenue by category / Textiles / $7,375 / Cerami | 1311, 327, 569, 319 | right | (1880, 487) | (1898, 487) | 240 |
| `recent-row` | #1042	Mara Okafor	$212.54	Paid | 1312, 772, 567, 62 | right | (1879, 803) | (1897, 803) | 240 |
| `object` | #1042 | 1334, 793, 49, 19 | right | (1383, 803) | (1401, 803) | 40 |
| `status` | Paid | 1745, 790, 63, 26 | right | (1809, 803) | (1827, 803) | 240 |

## catalogue

| Anchor | Content | Rect (x, y, w, h) | Side | Edge | Gutter | Free run |
|---|---|---|---|---|---|---|
| `search` | Search by name or SKU | 990, 182, 260, 36 | top | (1120, 182) | (1120, 164) | 240 |
| `product-card` | In order x1 / TEXTILES / FW-TX-201 / Linen Throw | 296, 238, 355, 400 | left | (296, 438) | (278, 438) | 240 |
| `stock-badge` | Low stock · 4 | 512, 925, 120, 26 | right | (632, 938) | (650, 938) | 40 |
| `object` | #1042 | 1549, 117, 70, 30 | right | (1619, 132) | (1637, 132) | 176 |
| `customer` | MO / Mara Okafor / mara.okafor@example.com / +1  | 1429, 166, 450, 103 | right | (1879, 218) | (1897, 218) | 240 |
| `line-items` | Linen Throw, Moss / FW-TX-201 · qty 1 / $84.00 / | 1429, 269, 450, 236 | right | (1879, 387) | (1897, 387) | 240 |
| `amount` | $212.54 | 1778, 881, 79, 27 | right | (1857, 895) | (1875, 895) | 240 |
| `primary-action` | Create order | 1451, 937, 406, 48 | right | (1857, 961) | (1875, 961) | 240 |

## order

| Anchor | Content | Rect (x, y, w, h) | Side | Edge | Gutter | Free run |
|---|---|---|---|---|---|---|
| `object` | Order #1042 | 296, 98, 180, 35 | left | (296, 115) | (278, 115) | 240 |
| `status` | Awaiting payment | 490, 102, 137, 26 | right | (627, 115) | (645, 115) | 240 |
| `primary-action` | Take payment | 1716, 118, 164, 42 | left | (1716, 139) | (1698, 139) | 8 |
| `amount` | Total due / $212.54 / USD · incl. tax | 296, 182, 255, 118 | right | (551, 241) | (569, 241) | 24 |
| `items-table` | PRODUCT	QTY	PRICE	TOTAL / Linen Throw, Moss / FW | 297, 382, 1078, 254 | left | (297, 509) | (279, 509) | 240 |
| `totals` | Subtotal / $188.00 / Shipping · standard / $9.50 | 993, 659, 360, 148 | left | (993, 733) | (975, 733) | 240 |
| `customer` | MO / Mara Okafor / mara.okafor@example.com / +1  | 1423, 264, 434, 62 | right | (1857, 295) | (1875, 295) | 240 |
| `timeline` | Order created / 09:41 · Priya Shah converted the | 1423, 580, 434, 232 | right | (1857, 696) | (1875, 696) | 240 |

## payment

| Anchor | Content | Rect (x, y, w, h) | Side | Edge | Gutter | Free run |
|---|---|---|---|---|---|---|
| `payment-row` | pay_3k9x2	#1042	Mara Okafor	Card 4242	$212.54	Pa | 297, 434, 1058, 74 | left | (297, 471) | (279, 471) | 240 |
| `status` | Paid | 1067, 458, 63, 26 | left | (1067, 471) | (1049, 471) | 24 |
| `object` | Order #1042 | 1743, 201, 114, 30 | left | (1743, 216) | (1725, 216) | 236 |
| `amount` | $212.54 | 1399, 291, 174, 51 | left | (1399, 316) | (1381, 316) | 240 |
| `details` | Customer / Mara Okafor / Method / Card ending 42 | 1399, 362, 458, 120 | left | (1399, 422) | (1381, 422) | 108 |
| `customer` | Mara Okafor | 1528, 362, 329, 21 | left | (1528, 372) | (1510, 372) | 40 |
| `timeline` | Authorised / 09:58:02 · card verified / Captured | 1399, 523, 458, 169 | left | (1399, 607) | (1381, 607) | 100 |
| `primary-action` | Send receipt | 1399, 941, 458, 48 | left | (1399, 965) | (1381, 965) | 240 |
