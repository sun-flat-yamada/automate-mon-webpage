import os
import json
import datetime
import collections
import sys

# Resolve history dir relative to this script (scripts/ -> project root -> history/)
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
HISTORY_DIR = os.path.join(_SCRIPT_DIR, '..', 'history')
TARGETS = ['dell_outlets_desktops', 'dell_outlets_desktops_biz', 'dell_outlets_workstations']

def load_data(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

def parse_timestamp(ts_str):
    # format: YYYY-MM-DD-HHMMSS (Directory name)
    try:
        return datetime.datetime.strptime(ts_str, '%Y-%m-%d-%H%M%S')
    except ValueError:
        return None

def analyze_target(target):
    target_dir = os.path.join(HISTORY_DIR, target)
    if not os.path.exists(target_dir):
        # Using sys.stderr to avoid messing up stdout redirection if used
        # print(f"Target directory not found: {target_dir}", file=sys.stderr)
        return [] # Return empty list gracefully

    # Get month directories
    try:
        month_dirs = sorted([d for d in os.listdir(target_dir) if os.path.isdir(os.path.join(target_dir, d))])
    except OSError:
        return []

    all_timestamps = []
    for month in month_dirs:
        month_path = os.path.join(target_dir, month)
        try:
            ts_dirs = sorted([d for d in os.listdir(month_path) if os.path.isdir(os.path.join(month_path, d))])
            for ts in ts_dirs:
                dt = parse_timestamp(ts)
                if dt:
                    all_timestamps.append((dt, os.path.join(month_path, ts)))
        except OSError:
            continue

    all_timestamps.sort(key=lambda x: x[0])

    events = []
    prev_items_map = {}

    first_run = True

    for dt, path in all_timestamps:
        data_file = os.path.join(path, 'data.json')
        if not os.path.exists(data_file):
            continue

        current_data = load_data(data_file)
        current_specs = {}
        for item in current_data:
            # Key: Specifications + Price
            spec = item.get('specifications', '').strip()
            price = item.get('price', '').strip()
            if not spec:
                continue
            key = f"{spec}|{price}"
            current_specs[key] = item

        if first_run:
            prev_items_map = current_specs
            first_run = False
            continue

        added_keys = set(current_specs.keys()) - set(prev_items_map.keys())

        if added_keys:
            for key in added_keys:
                item = current_specs[key]
                events.append({
                    'timestamp': dt, # UTC
                    'target': target,
                    'item': item.get('specifications', 'N/A'),
                    'price': item.get('price', 'N/A')
                })

        prev_items_map = current_specs

    return events

def main():
    try:
        # Check if directory exists
        if not os.path.exists(HISTORY_DIR):
            print(f"Error: History directory not found at {HISTORY_DIR}")
            return

        all_events = []
        for target in TARGETS:
            # print(f"Analyzing {target}...")
            target_events = analyze_target(target)
            all_events.extend(target_events)

        if not all_events:
            print("No addition events found.")
            return

        all_events.sort(key=lambda x: x['timestamp'])

        print(f"Total 'Item Added' events detected: {len(all_events)}")

        # JST = UTC + 9
        JST = datetime.timezone(datetime.timedelta(hours=9))
        UTC = datetime.timezone.utc

        weekday_dist = collections.defaultdict(int)
        hour_dist = collections.defaultdict(int)

        print("\n--- Event Log (JST) ---")
        for event in all_events:
            # Timestamp from dirname is UTC naive, let's treat it as UTC
            dt_utc = event['timestamp'].replace(tzinfo=UTC)
            dt_jst = dt_utc.astimezone(JST)

            wd = dt_jst.weekday() # 0=Mon
            hr = dt_jst.hour

            weekday_dist[wd] += 1
            hour_dist[hr] += 1

            item_short = (event['item'][:60] + '...') if len(event['item']) > 60 else event['item']
            print(f"{dt_jst.strftime('%Y-%m-%d %H:%M:%S')} [{event['target']}] {event['price']} - {item_short}")

        print("\n--- Statistical Report (JST) ---")
        weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        print("Item Additions by Day of Week:")
        for i, name in enumerate(weekdays):
            count = weekday_dist[i]
            bar = '#' * (count // 1)
            print(f"{name}: {count:3d} {bar}")

        print("\nItem Additions by Hour of Day:")
        for h in range(24):
            count = hour_dist[h]
            bar = '#' * (count // 1)
            print(f"{h:02d}: {count:3d} {bar}")

    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
