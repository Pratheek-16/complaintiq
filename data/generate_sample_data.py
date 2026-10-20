import csv
import random
from datetime import datetime, timedelta

CATEGORIES = [
    "Credit Reporting & Repair",
    "Debt Collection & Harassment",
    "Account Access & Management",
    "Fraudulent Charges & Dispute",
    "Mortgage & Loan Servicing",
    "Billing & Payment Processing"
]

COMPANIES = [
    "EquiData Bureau Corp",
    "Midland Recovery Partners",
    "Apex Global Bank",
    "Nova Financial Services",
    "National Crest Mortgage",
    "PayFlex Processing Systems",
    "Vanguard Credit Union",
    "First Horizon Bank"
]

LOCATIONS = ["CA", "TX", "NY", "FL", "IL", "PA", "OH", "GA", "NC", "MI"]
SEVERITIES = ["High", "Medium", "Low", "Critical"]

TEMPLATES = {
    "Credit Reporting & Repair": [
        "I reviewed my credit report and noticed an inaccurate derogatory account listed from {comp}. I submitted written dispute documents showing I never opened this account, but they refused to remove it.",
        "Incorrect balance reported on my credit profile. The credit bureau has failed to update my paid-in-full status despite three certified letters and documentation from {comp}.",
        "Fraudulent inquiry appeared on my credit file without my authorization. When I contacted {comp}, they refused to investigate and claimed they had legitimate business interest.",
        "A closed account is still reporting as delinquent and past due. This error dropped my credit score by 85 points and prevented me from securing a mortgage.",
        "My credit report lists mixed file data belonging to another individual with a similar name. {comp} did not verify the social security number before publishing negative marks.",
        "I filed a fraud alert and security freeze on my file, but {comp} allowed a third party to pull my credit without notifying me or requiring PIN verification."
    ],
    "Debt Collection & Harassment": [
        "A debt collector from {comp} has been repeatedly calling my workplace and cell phone after I explicitly sent a cease and desist notice. They threatened legal action and wage garnishment.",
        "Received a collection notice for a medical bill that was already paid in full by my health insurance. The collector refuses to provide debt validation within the 30-day statutory window.",
        "Debt collector from {comp} called my elderly mother and disclosed confidential financial details about a disputed balance. This violates federal debt collection privacy laws.",
        "I am being harassed for an ancient debt past the state statute of limitations. The agent threatened arrest if I did not make an immediate payment over the phone.",
        "Attempts to collect debt not owed. The collector from {comp} purchased unverified zombie debt and is attempting to intimidate me into paying someone else's obligation.",
        "Continuous automated robocalls at 6:30 AM from {comp} regarding an alleged credit card debt. Even after disputing ownership, harassment continues unabated."
    ],
    "Account Access & Management": [
        "I was suddenly locked out of my online banking account by {comp} without prior notice. Customer support was unable to verify my identity despite visiting a branch with government ID.",
        "My business checking account was frozen for two weeks due to a routine vendor wire transfer. Repeated calls to fraud operations yielded zero explanation and no access to payroll funds.",
        "Unable to reset my multi-factor authentication after switching phones. {comp} representatives kept disconnecting my calls after waiting on hold for over 90 minutes.",
        "I requested the closure of my checking account three months ago. {comp} kept the account active, charged monthly maintenance fees, and sent the negative balance to collections.",
        "Mobile deposit failed with an uninformative error, yet the check funds were debited from the issuer and never credited to my balance at {comp}.",
        "Attempted to update my mailing address and phone number online, but system errors prevented changes. When I called branch support, they insisted on in-person notarized forms."
    ],
    "Fraudulent Charges & Dispute": [
        "I noticed an unauthorized charge of $1,450.00 from an overseas retailer on my debit card. I immediately filed a dispute with {comp}, but they denied the claim citing chip-read verification.",
        "Multiple unauthorized recurring subscriptions drained over $800 from my checking account. {comp} failed to trigger fraud alerts and initially refused provisional credit.",
        "Stolen wallet resulted in fraudulent ATM withdrawals. Police report was provided within 24 hours, yet {comp} claimed I must have shared my PIN and closed the investigation against me.",
        "Card was compromised during a data breach. {comp} took over 18 business days to issue a replacement card, leaving me without access to basic funds while traveling.",
        "Unauthorized wire transfer was initiated from my account following a SIM-swap incident. {comp} failed to challenge the transfer with secondary biometric verification.",
        "Merchant double-charged my card for hotel reservations. Despite receipts showing single occupancy, {comp} refused to reverse the second charge after 60 days of dispute."
    ],
    "Mortgage & Loan Servicing": [
        "My mortgage servicer {comp} failed to pay property taxes from my escrow account on time, resulting in local county tax penalties and a lien notice against my primary residence.",
        "I applied for a loan modification due to medical hardship. {comp} repeatedly lost my financial disclosure forms and scheduled a foreclosure auction while the review was pending.",
        "Monthly mortgage payment was submitted before the grace period deadline, but {comp} posted it four days late and assessed an unjustified $125 late fee and reported delinquency.",
        "Servicing of my student loan was transferred to {comp}. During the migration, my auto-debit was cancelled without notice, causing an unexpected missed payment mark.",
        "Requested an escrow surplus refund after refinancing. {comp} acknowledged an excess balance of $3,200 but has withheld reimbursement for more than four months.",
        "Auto loan payoff quote was requested and paid in full by wire. {comp} refused to release the vehicle lien and title for six weeks, preventing sale of the car."
    ],
    "Billing & Payment Processing": [
        "Recurring automatic payment was processed twice in the same billing cycle by {comp}, triggering overdraft fees of $140. Support refused to refund the auxiliary bank charges.",
        "Payment sent via bill-pay was received on the 2nd of the month but not credited until the 18th. {comp} charged late finance charges and increased my APR to the penalty rate.",
        "I cancelled my premium subscription in writing, yet {comp} continued to debit $49.99 every month for five consecutive months. Refund requests have been ignored.",
        "Hidden administrative fees of $35 per transaction were added to my monthly statement without required disclosure or contractual amendment.",
        "Promotional zero-percent financing was terminated early by {comp} due to a minor system billing error on their end, backcharging retroactive interest of $640.",
        "Attempted to make an online loan payment before the midnight cutoff. The portal crashed, and {comp} penalized my account with a returned payment charge."
    ]
}

def generate_sample_dataset(output_path: str, count: int = 1500):
    start_date = datetime.now() - timedelta(days=180)
    rows = []

    for i in range(count):
        cat = random.choice(CATEGORIES)
        comp = random.choice(COMPANIES)
        loc = random.choice(LOCATIONS)
        sev = random.choices(SEVERITIES, weights=[0.25, 0.40, 0.25, 0.10])[0]
        date_offset = random.randint(0, 180)
        rec_date = start_date + timedelta(days=date_offset, hours=random.randint(8, 18), minutes=random.randint(0, 59))
        
        template = random.choice(TEMPLATES[cat])
        text = template.format(comp=comp)
        
        # Add slight natural variation or details
        if random.random() < 0.3:
            text += f" Reference claim ID #{random.randint(100000, 999999)}."

        ext_id = f"CMP-{100000 + i}"
        dept = cat.split(" ")[0]

        rows.append({
            "Complaint_ID": ext_id,
            "Complaint_Text": text,
            "Category": cat,
            "Date_Received": rec_date.strftime("%Y-%m-%d %H:%M:%S"),
            "Product": cat,
            "Company": comp,
            "Location": loc,
            "Department": dept,
            "Severity": sev
        })

    # Add a few edge cases: duplicates and near-duplicates to test duplicate engine
    dupe_source = rows[10]
    for k in range(3):
        dupe = dict(dupe_source)
        dupe["Complaint_ID"] = f"CMP-DUPE-{k}"
        rows.append(dupe)

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        fieldnames = ["Complaint_ID", "Complaint_Text", "Category", "Date_Received", "Product", "Company", "Location", "Department", "Severity"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Generated {len(rows)} sample complaints at: {output_path}")

if __name__ == "__main__":
    generate_sample_dataset("data/sample_customer_complaints.csv", count=1500)
