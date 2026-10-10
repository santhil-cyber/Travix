import os
from app import app, db, ManualZone  # We will import these from our updated app.py

print("Initializing the database...")

# Create the database file and the 'manual_zone' table
with app.app_context():
    db.create_all()

    # Check if zones already exist to avoid duplicates
    if ManualZone.query.first() is None:
        print("Adding sample manual zones...")
        # Create a few sample manual zones for testing
        zone1 = ManualZone(
            name="Tawang Monastery - Verified Safe",
            type="safe",
            lat=27.5875,
            lng=91.8596,
            radius=1500
        )
        zone2 = ManualZone(
            name="Sela Pass - High Altitude Warning",
            type="warning",
            lat=27.4891,
            lng=92.1032,
            radius=2000
        )
        db.session.add(zone1)
        db.session.add(zone2)
        db.session.commit()
        print("Sample zones added.")
    else:
        print("Database already contains zones.")

print("Database initialization complete.")