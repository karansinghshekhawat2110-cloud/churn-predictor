
import pandas as pd

def engineer_features(df):
    service_cols = [
        'PhoneService', 'MultipleLines', 'OnlineSecurity', 'OnlineBackup',
        'DeviceProtection', 'TechSupport', 'StreamingTV', 'StreamingMovies'
    ]

    df = df.copy()

    df['tenure_monthly_ratio']     = df['tenure'] / (df['MonthlyCharges'] + 1)
    df['is_long_term_contract']    = (df['Contract'] == 2).astype(int)
    df['service_count']            = df[service_cols].sum(axis=1)
    df['avg_monthly_per_service']  = df['MonthlyCharges'] / (df['service_count'] + 1)
    df['is_senior_alone']          = (
        (df['SeniorCitizen'] == 1) &
        (df['Partner'] == 0) &
        (df['Dependents'] == 0)
    ).astype(int)

    median_bill = df['MonthlyCharges'].median()
    df['is_fiber_high_bill']       = (
        (df['InternetService_Fiber optic'] == 1) &
        (df['MonthlyCharges'] > median_bill)
    ).astype(int)

    df['no_support_services']      = (
        (df['OnlineSecurity'] == 0) &
        (df['TechSupport'] == 0)
    ).astype(int)

    df['contract_tenure_interact'] = df['Contract'] * df['tenure']

    return df
