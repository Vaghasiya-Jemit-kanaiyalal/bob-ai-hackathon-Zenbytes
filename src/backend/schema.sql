-- =============================================================================
-- Urban Fleet Intelligence Copilot — MySQL Schema
-- Run once against your database:  mysql -u <user> -p <db> < schema.sql
-- =============================================================================

-- ─── users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  name        VARCHAR(120) NOT NULL,
  role        ENUM('admin','dispatcher','analyst','viewer') NOT NULL DEFAULT 'viewer',
  password_hash VARCHAR(255) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── drivers ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  phone         VARCHAR(30),
  license_no    VARCHAR(50),
  driver_since  DATE,
  incidents     INT UNSIGNED NOT NULL DEFAULT 0,
  active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── vehicles ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id                  VARCHAR(20) PRIMARY KEY,          -- e.g. VH-001
  plate               VARCHAR(20) NOT NULL UNIQUE,
  make                VARCHAR(60) NOT NULL,
  model               VARCHAR(60) NOT NULL,
  year                SMALLINT UNSIGNED NOT NULL,
  type                ENUM('Delivery Van','Box Truck','Freight Truck','Cargo Van','Flatbed') NOT NULL,
  engine_type         ENUM('Diesel','Gasoline','Hybrid','Electric') NOT NULL,
  vin                 VARCHAR(17),
  capacity_kg         SMALLINT UNSIGNED DEFAULT 0,
  odometer_km         INT UNSIGNED DEFAULT 0,
  fuel_level          TINYINT UNSIGNED DEFAULT 100,      -- %
  speed               SMALLINT UNSIGNED DEFAULT 0,       -- mph
  status              ENUM('active','idle','maintenance','offline') NOT NULL DEFAULT 'idle',
  risk                ENUM('low','medium','high','critical') NOT NULL DEFAULT 'low',
  efficiency          TINYINT UNSIGNED DEFAULT 0,        -- %
  trips               SMALLINT UNSIGNED DEFAULT 0,
  location            VARCHAR(120),
  avg_fuel_consumption DECIMAL(5,2) DEFAULT 0,           -- L/100km
  last_service_date   DATE,
  next_service_due    DATE,
  next_service_odometer INT UNSIGNED,
  insurance_expiry    DATE,
  registration_expiry DATE,
  driver_id           INT UNSIGNED,
  last_update         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_vehicle_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
);

-- ─── routes ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routes (
  id             VARCHAR(10) PRIMARY KEY,               -- e.g. R-01
  name           VARCHAR(120) NOT NULL,
  distance_km    DECIMAL(8,2) NOT NULL,
  avg_duration   SMALLINT UNSIGNED NOT NULL,            -- minutes
  on_time_rate   DECIMAL(5,2) NOT NULL DEFAULT 0,       -- %
  incidents      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  vehicle_count  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  status         ENUM('optimal','congested','disrupted') NOT NULL DEFAULT 'optimal',
  trend          ENUM('up','down','stable') NOT NULL DEFAULT 'stable',
  daily_trips    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  zone           VARCHAR(80),
  description    TEXT,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── trips ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trips (
  id             VARCHAR(20) PRIMARY KEY,               -- e.g. TR-001
  vehicle_id     VARCHAR(20) NOT NULL,
  driver_id      INT UNSIGNED,
  route_id       VARCHAR(10),
  origin         VARCHAR(120),
  destination    VARCHAR(120),
  status         ENUM('completed','in-progress','delayed','cancelled') NOT NULL DEFAULT 'in-progress',
  risk           ENUM('low','medium','high','critical') NOT NULL DEFAULT 'low',
  start_time     DATETIME,
  end_time       DATETIME,
  eta            DATETIME,
  scheduled_duration SMALLINT UNSIGNED,                 -- minutes
  actual_duration    SMALLINT UNSIGNED,
  distance_km    DECIMAL(8,2),
  delay_min      SMALLINT DEFAULT 0,
  fuel_used_l    DECIMAL(8,2),
  avg_speed      SMALLINT UNSIGNED,
  max_speed      SMALLINT UNSIGNED,
  idle_time_min  SMALLINT UNSIGNED DEFAULT 0,
  date           DATE,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_trip_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  CONSTRAINT fk_trip_driver  FOREIGN KEY (driver_id)  REFERENCES drivers(id) ON DELETE SET NULL,
  CONSTRAINT fk_trip_route   FOREIGN KEY (route_id)   REFERENCES routes(id)  ON DELETE SET NULL
);

-- ─── maintenance ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_id   VARCHAR(20) NOT NULL,
  type         ENUM('oil_change','tire_rotation','brake_service','engine_check',
                    'full_service','transmission','battery','inspection') NOT NULL,
  description  TEXT,
  technician   VARCHAR(120),
  shop         VARCHAR(160),
  cost         DECIMAL(10,2) NOT NULL DEFAULT 0,
  status       ENUM('completed','scheduled','overdue') NOT NULL DEFAULT 'scheduled',
  odometer_km  INT UNSIGNED,
  service_date DATE NOT NULL,
  next_due_date DATE,
  notes        TEXT,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_maint_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

-- ─── risk_analysis ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS risk_analysis (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_id   VARCHAR(20) NOT NULL,
  trip_id      VARCHAR(20),
  event_type   ENUM('speeding','hard_braking','sharp_cornering','idle_excess',
                    'lane_departure','other') NOT NULL,
  severity     ENUM('low','medium','high','critical') NOT NULL DEFAULT 'low',
  speed_at_event SMALLINT UNSIGNED,
  location     VARCHAR(180),
  occurred_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved     TINYINT(1) NOT NULL DEFAULT 0,
  notes        TEXT,
  CONSTRAINT fk_risk_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  CONSTRAINT fk_risk_trip    FOREIGN KEY (trip_id)    REFERENCES trips(id) ON DELETE SET NULL
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX idx_trips_vehicle    ON trips(vehicle_id);
CREATE INDEX idx_trips_route      ON trips(route_id);
CREATE INDEX idx_trips_status     ON trips(status);
CREATE INDEX idx_trips_date       ON trips(date);
CREATE INDEX idx_maint_vehicle    ON maintenance(vehicle_id);
CREATE INDEX idx_maint_status     ON maintenance(status);
CREATE INDEX idx_risk_vehicle     ON risk_analysis(vehicle_id);
CREATE INDEX idx_risk_event_type  ON risk_analysis(event_type);

-- =============================================================================
-- Seed data — mirrors the React mock data so the frontend renders identically
-- =============================================================================

INSERT IGNORE INTO drivers (id, name, phone, license_no, driver_since, incidents) VALUES
(1,  'Marcus Thompson',   '+1-555-0101', 'DL-TX-9821',  '2019-03-15', 2),
(2,  'Sarah Chen',        '+1-555-0102', 'DL-CA-7734',  '2020-07-01', 0),
(3,  'Carlos Rivera',     '+1-555-0103', 'DL-FL-5512',  '2018-11-20', 4),
(4,  'Aisha Patel',       '+1-555-0104', 'DL-NY-3345',  '2021-02-10', 1),
(5,  'James O''Connor',   '+1-555-0105', 'DL-IL-8890',  '2017-06-05', 3),
(6,  'Lisa Washington',   '+1-555-0106', 'DL-TX-2267',  '2020-09-14', 1),
(7,  'David Park',        '+1-555-0107', 'DL-CA-6612',  '2019-12-01', 0),
(8,  'Maria Santos',      '+1-555-0108', 'DL-AZ-9901',  '2022-01-20', 2),
(9,  'Robert Kim',        '+1-555-0109', 'DL-WA-4423',  '2018-04-18', 5),
(10, 'Jennifer Adams',    '+1-555-0110', 'DL-OR-7789',  '2021-08-30', 0),
(11, 'Michael Torres',    '+1-555-0111', 'DL-NV-3312',  '2016-09-22', 7),
(12, 'Emma Wilson',       '+1-555-0112', 'DL-CO-5567',  '2023-03-05', 0);

INSERT IGNORE INTO routes (id, name, distance_km, avg_duration, on_time_rate, incidents, vehicle_count, status, trend, daily_trips) VALUES
('R-01', 'Downtown Core Loop',      48.0,  95, 88.0, 3, 12, 'optimal',   'stable', 24),
('R-02', 'Northside Industrial',    62.0, 110, 82.0, 5, 8,  'congested', 'down',   18),
('R-03', 'Airport Connector',       35.0,  70, 94.0, 1, 6,  'optimal',   'up',     31),
('R-04', 'South Port Freight',      78.0, 135, 76.0, 8, 10, 'disrupted', 'down',   15),
('R-05', 'East Residential Circuit',55.0, 100, 90.0, 2, 9,  'optimal',   'stable', 22),
('R-06', 'West Cross-Town Express', 42.0,  85, 87.0, 4, 7,  'congested', 'stable', 19),
('R-07', 'Suburb Ring Road',        91.0, 155, 71.0, 11, 5, 'disrupted', 'down',   12),
('R-08', 'Central Distribution Hub',67.0, 120, 92.0, 2, 14, 'optimal',  'up',     28);

INSERT IGNORE INTO vehicles
  (id, plate, make, model, year, type, engine_type, vin, capacity_kg, odometer_km,
   fuel_level, speed, status, risk, efficiency, trips, location, avg_fuel_consumption,
   last_service_date, next_service_due, next_service_odometer,
   insurance_expiry, registration_expiry, driver_id)
VALUES
('VH-001','TRK-7821','Ford',  'Transit 350',  2022,'Delivery Van', 'Diesel',  'WF0EXXTTXE6B00001',1500,142800,72,34,'active',   'high',    85,147,'Downtown Core',          12.4,'2024-03-15','2024-09-15',145000,'2025-03-01','2024-12-31',1),
('VH-002','VAN-3344','Dodge', 'Sprinter 2500',2021,'Cargo Van',    'Diesel',  'WD4PH841565900002',1200,89200, 45,0, 'idle',     'medium',  72,89, 'North Depot',            10.8,'2024-05-20','2024-11-20',92000, '2025-01-15','2025-03-31',2),
('VH-003','TRK-5512','Isuzu', 'NPR-HD',       2020,'Box Truck',    'Diesel',  '4KLB4B1W7LJ000003',3500,201400,18,0, 'maintenance','critical',0, 203,'Fleet Maintenance Bay',  14.2,'2024-06-01','2024-06-01',201400,'2024-11-30','2025-01-31',3),
('VH-004','FRT-9901','Volvo', 'VNL 760',      2023,'Freight Truck','Diesel',  '4V4NC9GH7PN000004',8000,56700, 88,52,'active',   'low',     91,56, 'South Port Gate 4',      22.1,'2024-04-10','2025-04-10',60000, '2025-06-30','2025-12-31',4),
('VH-005','VAN-6678','Mercedes','Sprinter 3500',2022,'Delivery Van','Gasoline','WD4PH842X65000005',1800,118900,63,28,'active',   'medium',  78,134,'Eastside Hub',           11.9,'2024-02-28','2024-08-28',122000,'2025-02-28','2025-06-30',5),
('VH-006','TRK-2234','Ford',  'F-650 Pro',    2021,'Box Truck',    'Diesel',  'WF06XXTTG6B000006',4000,167300,55,0, 'idle',     'low',     0,  98, 'West Depot',             15.6,'2024-05-05','2024-11-05',170000,'2025-05-31','2025-09-30',6),
('VH-007','HYB-8845','Toyota','Proace City',  2023,'Delivery Van', 'Hybrid',  'NMTKKKEL9NR000007',900, 34200, 91,41,'active',   'low',     94,42, 'Central Terminal',       7.3, '2024-06-10','2025-06-10',40000, '2025-08-31','2025-11-30',7),
('VH-008','FRT-3367','Kenworth','T680',       2022,'Freight Truck','Diesel',  '1XKYD49X4KJ000008',10000,289100,31,0,'maintenance','high',   0,  178,'Fleet Maintenance Bay',  24.8,'2024-06-15','2024-06-15',289100,'2024-10-31','2025-02-28',8),
('VH-009','ELC-1122','Rivian','EDV 700',      2023,'Delivery Van', 'Electric','7FCTGAAB5PE000009',1000,22800, 68,37,'active',   'low',     97,28, 'Downtown North',         0,   '2024-05-30','2025-05-30',30000, '2025-09-30','2025-12-31',9),
('VH-010','VAN-7790','Nissan','NV2500 HD',    2020,'Cargo Van',    'Gasoline','JN6BF0KW9LX000010',1400,156700,22,0, 'offline',  'medium',  0,  112,'Unknown',               12.7,'2023-12-20','2024-06-20',160000,'2024-09-30','2024-12-31',10),
('VH-011','TRK-4456','Mercedes','Actros 1845',2021,'Freight Truck','Diesel',  'WDB9630321L000011',11000,334800,79,61,'active',   'critical',74, 241,'Highway 45 North',       26.3,'2024-01-15','2024-07-15',340000,'2025-01-31','2025-04-30',11),
('VH-012','VAN-9923','Ford',  'Transit Custom',2023,'Delivery Van','Diesel',  'WF0YXXTTGY8000012',1100,41500, 84,25,'active',   'low',     88,51, 'Airport Terminal B',     10.2,'2024-06-01','2025-06-01',50000, '2025-07-31','2025-10-31',12);

INSERT IGNORE INTO trips
  (id, vehicle_id, driver_id, route_id, origin, destination, status, risk,
   start_time, eta, scheduled_duration, distance_km, delay_min, fuel_used_l, date)
VALUES
('TR-001','VH-001',1,'R-01','Central Depot',   'Downtown Terminal','in-progress','high',   NOW() - INTERVAL 2 HOUR, NOW() + INTERVAL 18 MINUTE,95,48.0,18, 5.2, CURDATE()),
('TR-002','VH-004',4,'R-03','Airport Terminal','South Port',       'in-progress','low',    NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 25 MINUTE,70,35.0,0,  3.1, CURDATE()),
('TR-003','VH-011',11,'R-07','North Depot',    'Suburb Ring End',  'delayed',    'critical',NOW()-INTERVAL 3 HOUR, NOW() + INTERVAL 45 MINUTE,155,91.0,38,22.4, CURDATE()),
('TR-004','VH-005',5,'R-05','Eastside Hub',    'Residential Zone E','in-progress','medium',NOW()-INTERVAL 90 MINUTE,NOW()+INTERVAL 12 MINUTE,100,55.0,7, 6.8, CURDATE()),
('TR-005','VH-009',9,'R-01','Downtown North',  'Central Terminal',  'completed',  'low',   NOW()-INTERVAL 4 HOUR, NOW()-INTERVAL 2 HOUR,95,48.0,0,  0.0, CURDATE()),
('TR-006','VH-007',7,'R-05','Central Terminal','Airport Terminal',  'completed',  'low',   NOW()-INTERVAL 5 HOUR, NOW()-INTERVAL 3 HOUR,70,35.0,-5, 2.6, CURDATE()),
('TR-007','VH-002',2,'R-02','North Depot',     'Industrial Park N', 'completed',  'medium',NOW()-INTERVAL 6 HOUR, NOW()-INTERVAL 4 HOUR,110,62.0,12, 6.8, CURDATE()),
('TR-008','VH-012',12,'R-03','Airport Terminal B','Central Depot',  'in-progress','low',   NOW()-INTERVAL 30 MINUTE,NOW()+INTERVAL 40 MINUTE,70,35.0,0, 1.8, CURDATE());

INSERT IGNORE INTO maintenance
  (vehicle_id, type, description, technician, shop, cost, status, odometer_km, service_date, next_due_date)
VALUES
('VH-003','full_service',   'Full service + brake overhaul',    'Mike Johnson', 'Fleet Pro Garage',  850.00,'scheduled',201400,CURDATE(),              CURDATE() + INTERVAL 6 MONTH),
('VH-008','engine_check',   'Engine diagnostics + injector clean','Tom Rivera',  'TruckTech Services',480.00,'scheduled',289100,CURDATE(),              CURDATE() + INTERVAL 3 MONTH),
('VH-001','oil_change',     'Oil & filter change',              'Sarah Lee',    'Quick Lube Fleet',  120.00,'completed',140000,'2024-03-15',            '2024-09-15'),
('VH-011','tire_rotation',  'Rotate + balance all 6 tyres',     'Carlos Ruiz',  'TireMaster Pro',    220.00,'overdue',  330000,'2024-01-15',            CURDATE() - INTERVAL 10 DAY),
('VH-005','brake_service',  'Front brake pad replacement',       'James White',  'Fleet Pro Garage',  390.00,'completed',115000,'2024-02-28',            '2024-08-28');

INSERT IGNORE INTO risk_analysis
  (vehicle_id, trip_id, event_type, severity, speed_at_event, location, occurred_at)
VALUES
('VH-001','TR-001','speeding',       'high',   82, 'Main St & 5th Ave',     NOW() - INTERVAL 90 MINUTE),
('VH-001','TR-001','hard_braking',   'medium', 65, 'Downtown Tunnel',        NOW() - INTERVAL 60 MINUTE),
('VH-011','TR-003','speeding',       'critical',91,'Highway 45 Mile 32',     NOW() - INTERVAL 2 HOUR),
('VH-011','TR-003','lane_departure', 'high',   78, 'Highway 45 Mile 41',     NOW() - INTERVAL 90 MINUTE),
('VH-005','TR-004','sharp_cornering','medium', 42, 'Residential Blvd Turn',  NOW() - INTERVAL 45 MINUTE),
('VH-002',NULL,    'idle_excess',    'low',    0,  'North Depot Yard',        NOW() - INTERVAL 4 HOUR),
('VH-010',NULL,    'other',          'medium', 0,  'Unknown — offline',       NOW() - INTERVAL 8 HOUR);
