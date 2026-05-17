from pydantic import BaseModel
from typing import Dict,List


class BudgetAnalysisItem(BaseModel):
    category: str
    limit: float
    period: str
    spent: float
    spent: float
    used_percentage: float
    status: str

class AnalysisResponse(BaseModel):
    spending_by_category: Dict[str,float]
    budget_analysis: List[BudgetAnalysisItem]