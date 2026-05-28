-- 2. Seed: 24 tipos de turno (verificados contra Excel HORARIOS FORMATO STAFF)
-- Cocina: 7, Barra: 7, Servicio: 10 = 24 total
INSERT INTO shift_types (code, name, area, entrada, salida, ordinarias, nocturnas, description) VALUES
-- Cocina (7)
('A', 'Apertura', 'cocina', '09:00', '16:00', 7.0, 0, 'Turno manana cocina'),
('C', 'Cierre', 'cocina', '15:00', '22:30', 6.0, 1.5, 'Turno tarde cocina'),
('S', 'Seguido', 'cocina', '10:00', '22:30', 10.5, 1.5, 'Turno largo cocina, supera 8h genera HE'),
('P1', 'Partido 9', 'cocina', '09:00', '22:30', 9.0, 1.5, 'Turno partido largo cocina'),
('P2', 'Partido 10', 'cocina', '10:00', '22:30', 10.0, 1.5, 'Turno partido largo cocina'),
('CS', 'Cierre Steward', 'cocina', '16:00', '22:30', 4.5, 1.5, 'Turno corto steward'),
('CD', 'Cierre Domestic@', 'cocina', '14:00', '22:30', 5.5, 1.5, 'Turno medio cocina'),
-- Barra (7)
('B1', 'Apertura Bar', 'barra', '16:00', '00:00', 5.0, 3.0, 'Nocturno barra apertura'),
('B2', 'Manana Bar', 'barra', '10:00', '17:00', 7.0, 0, 'Turno manana barra'),
('B3', 'Noche Bar', 'barra', '18:00', '02:00', 1.0, 6.0, 'Nocturno barra noche'),
('B4', 'Largo Bar', 'barra', '16:00', '01:00', 4.0, 6.0, 'Nocturno largo barra'),
('B5', 'Partido Bar', 'barra', '12:00', '00:00', 6.0, 4.0, 'Turno partido barra'),
('B6', 'Noche Corta', 'barra', '17:00', '23:00', 2.0, 4.0, 'Turno corto barra noche'),
('BA', 'Barback Madrugada', 'barra', '01:00', '06:00', 0.0, 5.0, 'Turno madrugada barback'),
-- Servicio (10)
('M1', 'Manana Host', 'servicio', '10:00', '16:00', 6.0, 0, 'Host manana servicio'),
('T1', 'Tarde Host', 'servicio', '14:00', '20:00', 5.0, 1.0, 'Host tarde servicio'),
('N1', 'Noche Estandar', 'servicio', '18:00', '01:00', 1.0, 6.0, 'Noche estandar servicio'),
('N2', 'Noche Larga', 'servicio', '17:00', '01:00', 2.0, 6.0, 'Noche larga servicio'),
('P1L', 'Partido Largo', 'servicio', '11:00', '00:00', 5.0, 5.0, 'Partido largo servicio'),
('P2L', 'Partido Corto', 'servicio', '11:00', '23:00', 5.0, 4.0, 'Partido corto servicio'),
('MA1', 'Madrugada', 'servicio', '01:00', '10:00', 6.0, 3.0, 'Madrugada servicio'),
('MC', 'Manana Corta', 'servicio', '10:00', '15:00', 5.0, 0, 'Manana corta servicio'),
('CJA', 'Cajero Apertura', 'servicio', '09:00', '16:00', 7.0, 0, 'Cajero dia servicio'),
('CJN', 'Cajero Noche', 'servicio', '17:00', '01:00', 2.0, 6.0, 'Cajero noche servicio')
ON CONFLICT (code, area) DO NOTHING;