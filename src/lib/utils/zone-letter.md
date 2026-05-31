# zone-letter.ts

- **Que hace**: Mapea nombres de zona a letras (Terraza=T, Interior=I, Barra=B, etc.)
- **Datos**: Exporta getZoneLetter(zoneName), getZoneFromLetter(letter)
- **Dependencias**: Usado por FloorPlanMap, TableMap, HostFloorPlan
- **Pitfalls**: Si se agregan zonas nuevas, hay que actualizar el mapa aqui
