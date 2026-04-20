
-- Generate 3-6 line items per CMD-LAZY order with one shipment each
DO $$
DECLARE
  o RECORD;
  ship_id UUID;
  n_items INT;
  i INT;
  prods TEXT[] := ARRAY[
    'Câble R2V 3G2.5',
    'Disjoncteur Schneider C60N 16A',
    'Tableau électrique Legrand 13M',
    'Prise Mosaic 2P+T',
    'Interrupteur Céliane',
    'Goulotte PVC 40x40',
    'Boîte de dérivation IP55',
    'Gaine ICTA Ø20',
    'Détecteur de mouvement BEG',
    'Spot LED encastré 7W'
  ];
  refs TEXT[] := ARRAY[
    'NEX25131', 'SCH24016', 'LEG401213',
    'LEG077103', 'LEG067001', 'LEG030410',
    'LEG092046', 'NEX10162', 'BEG92193',
    'LEG089762'
  ];
  sup TEXT[] := ARRAY['Nexans', 'Schneider', 'Legrand', 'Legrand', 'Legrand', 'Legrand', 'Legrand', 'Nexans', 'BEG', 'Legrand'];
  idx INT;
  qty INT;
  remain INT;
BEGIN
  FOR o IN SELECT id, status, expected_delivery FROM orders WHERE order_number LIKE 'CMD-LAZY%' LOOP
    -- create 1 shipment
    INSERT INTO shipments (order_id, shipment_index, status, carrier, expected_delivery, data_source, last_update)
    VALUES (
      o.id, 1,
      CASE WHEN o.status IN ('completed') THEN 'delivered' WHEN o.status IN ('in_transit','partially_delivered') THEN 'in_transit' ELSE 'confirmed' END,
      (ARRAY['Chronopost','DPD','GLS','Geodis'])[1 + floor(random()*4)::int],
      o.expected_delivery,
      'mock', now()
    ) RETURNING id INTO ship_id;

    n_items := 3 + floor(random()*4)::int; -- 3-6 items
    FOR i IN 1..n_items LOOP
      idx := 1 + floor(random()*10)::int;
      qty := 1 + floor(random()*10)::int;
      remain := CASE WHEN o.status = 'completed' THEN 0 WHEN o.status = 'partially_delivered' THEN floor(qty/2)::int ELSE qty END;
      INSERT INTO line_items (order_id, shipment_id, product_name, product_reference, supplier, quantity, unit_price, remaining)
      VALUES (
        o.id, ship_id,
        prods[idx], refs[idx], sup[idx],
        qty,
        round((10 + random()*200)::numeric, 2),
        remain
      );
    END LOOP;
  END LOOP;
END $$;
