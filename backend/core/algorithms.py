from datetime import date,timedelta,datetime

def merge(left,right,key,reverse=False):
    result = []
    i = 0
    j = 0
    while i < len(left) and j < len(right):
        condition = left[i][key] <= right[j][key] if not reverse else left[i][key] >= right[j][key]
        if condition:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1

    result += left[i:]
    result += right[j:]
    return result       

def merge_sort(list,key=None,reverse=False):
    if len(list) <= 1: # validate len(list)
        return list
    else:
        mid = len(list) // 2 # split the list in half
    # divide into left and right section 
    left_section = []
    right_section = []
    for i in range(len(list)): #check test.py for the example
        if i < mid:
            left_section.append(list[i])
        else:
            right_section.append(list[i])    
    left_section = merge_sort(left_section,key,reverse)
    right_section = merge_sort(right_section,key,reverse)
    return merge(left_section, right_section, key, reverse)

def get_spending_by_category(transactions, budgets):
    result = {}
    for budget in budgets:
        category = budget["category"]
        total = sum(
            t["amount"] for t in transactions
            if t["category"] == category and t["type"] == "expense"
        )
        result[category] = total 
    return result

def get_period_transaction(transactions, budget):
    today = date.today()
    if budget["period"] == "week":
        period_start = today - timedelta(days=today.weekday())
    elif budget["period"] == "month":
        period_start = today.replace(day=1)

    result = []
    for t in transactions:
        t_date = t["date"]
        # handle both datetime objects and strings
        if isinstance(t_date, datetime):
            t_date = t_date.date()
        elif isinstance(t_date, str):
            t_date = datetime.strptime(t_date, "%Y-%m-%d").date()
        
        if (t_date >= period_start 
            and t["category"] == budget["category"]
            and t["amount"] > 0
            and t["type"] == "expense"):
            result.append(t)
    return result

def analyze_budgets(transactions, budgets):
    results = []
    for budget in budgets:
        period_transactions = get_period_transaction(transactions, budget)
        spent = sum(t["amount"] for t in period_transactions)
        used_percentage = (spent / budget["limit"]) * 100 if budget["limit"] > 0 else 0
        
        if used_percentage < 60:
            status = "acceptable"
        elif used_percentage < 80:
            status = "caution"
        elif used_percentage < 100:
            status = "warning"
        else:
            status = "exceeded"
        
        results.append({
            "category": budget["category"],
            "limit": budget["limit"],
            "period": budget["period"],
            "spent": spent,
            "used_percentage": used_percentage,
            "status": status
        })
    return results
    