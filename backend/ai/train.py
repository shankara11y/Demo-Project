import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

def generate_synthetic_data(num_samples=5000):
    np.random.seed(42)
    
    temps = []
    ideal_temp_min = []
    ideal_temp_max = []
    
    humidity = []
    ideal_humidity_min = []
    ideal_humidity_max = []
    
    rainfall = []
    ideal_rainfall_min = []
    ideal_rainfall_max = []
    
    wind_speed = []
    season_match = []
    labels = []
    
    for i in range(num_samples):
        # Generate base crop requirement bounds
        t_min = np.random.uniform(10.0, 22.0)
        t_max = t_min + np.random.uniform(10.0, 18.0)
        
        r_min = np.random.uniform(20.0, 80.0)
        r_max = r_min + np.random.uniform(40.0, 120.0)
        
        h_min = np.random.uniform(40.0, 60.0)
        h_max = h_min + np.random.uniform(20.0, 35.0)
        
        # Decide class label first to guarantee balanced classes!
        label = np.random.choice([0, 1, 2], p=[0.3, 0.35, 0.35])
        
        s_match = 1
        if label == 0:
            # Not suitable reasons: season mismatch, or extreme weather
            s_match = np.random.choice([0, 1], p=[0.5, 0.5])
            if s_match == 0:
                t_val = np.random.uniform(t_min, t_max)
                r_val = np.random.uniform(r_min, r_max)
                h_val = np.random.uniform(h_min, h_max)
                w_val = np.random.uniform(0.0, 15.0)
            else:
                violation_type = np.random.choice(["wind", "multi"])
                if violation_type == "wind":
                    t_val = np.random.uniform(t_min, t_max)
                    r_val = np.random.uniform(r_min, r_max)
                    h_val = np.random.uniform(h_min, h_max)
                    w_val = np.random.uniform(26.0, 40.0)
                else:
                    t_val = t_max + np.random.uniform(2.0, 10.0)
                    r_val = r_max + np.random.uniform(30.0, 100.0)
                    h_val = np.random.uniform(h_min, h_max)
                    w_val = np.random.uniform(0.0, 15.0)
        elif label == 1:
            # Moderately suitable: season match, exactly 1 slight violation
            violation = np.random.choice(["temp", "rain", "hum", "wind"])
            if violation == "temp":
                t_val = t_max + np.random.uniform(0.5, 4.0)
                r_val = np.random.uniform(r_min, r_max)
                h_val = np.random.uniform(h_min, h_max)
                w_val = np.random.uniform(0.0, 15.0)
            elif violation == "rain":
                t_val = np.random.uniform(t_min, t_max)
                r_val = r_min - np.random.uniform(5.0, 15.0)
                h_val = np.random.uniform(h_min, h_max)
                w_val = np.random.uniform(0.0, 15.0)
            elif violation == "hum":
                t_val = np.random.uniform(t_min, t_max)
                r_val = np.random.uniform(r_min, r_max)
                h_val = h_max + np.random.uniform(5.0, 15.0)
                w_val = np.random.uniform(0.0, 15.0)
            else:
                t_val = np.random.uniform(t_min, t_max)
                r_val = np.random.uniform(r_min, r_max)
                h_val = np.random.uniform(h_min, h_max)
                w_val = np.random.uniform(16.0, 25.0)
        else:
            # Suitable: season match, all parameters in range, wind is low
            t_val = np.random.uniform(t_min + 1.0, t_max - 1.0)
            r_val = np.random.uniform(r_min + 5.0, r_max - 5.0)
            h_val = np.random.uniform(h_min + 2.0, h_max - 2.0)
            w_val = np.random.uniform(0.0, 12.0)
            
        temps.append(t_val)
        ideal_temp_min.append(t_min)
        ideal_temp_max.append(t_max)
        
        humidity.append(h_val)
        ideal_humidity_min.append(h_min)
        ideal_humidity_max.append(h_max)
        
        rainfall.append(r_val)
        ideal_rainfall_min.append(r_min)
        ideal_rainfall_max.append(r_max)
        
        wind_speed.append(w_val)
        season_match.append(s_match)
        labels.append(label)

    df = pd.DataFrame({
        "temp": temps,
        "temp_min": ideal_temp_min,
        "temp_max": ideal_temp_max,
        "humidity": humidity,
        "humidity_min": ideal_humidity_min,
        "humidity_max": ideal_humidity_max,
        "rainfall": rainfall,
        "rainfall_min": ideal_rainfall_min,
        "rainfall_max": ideal_rainfall_max,
        "wind_speed": wind_speed,
        "season_match": season_match,
        "label": labels
    })
    
    return df

def train_model():
    print("Generating synthetic crop-weather data...")
    df = generate_synthetic_data()
    
    X = df.drop(columns=["label"])
    y = df["label"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print("Training RandomForestClassifier...")
    clf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42)
    clf.fit(X_train, y_train)
    
    # Evaluate
    y_pred = clf.predict(X_test)
    print("Model Evaluation:")
    print(classification_report(y_test, y_pred, target_names=["Not Suitable", "Moderately Suitable", "Suitable"]))
    
    model_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "sowing_model.joblib")
    joblib.dump(clf, model_path)
    print(f"Model saved successfully to {model_path}")

if __name__ == "__main__":
    train_model()
