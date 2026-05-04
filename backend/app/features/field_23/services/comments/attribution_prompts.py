"""Prompt templates για σύνδεση νομοτεχνικών σχολίων με αλλαγές άρθρων (Gemini / LangChain)."""

from langchain_core.prompts import ChatPromptTemplate

_LEGISLATIVE_COMMENT_ATTRIBUTION_SYSTEM = (
    "Είσαι νομοτεχνικός αναλυτής. Σου δίνεται το κείμενο ενός άρθρου πριν και μετά την "
    "τροποποίηση, και λίστα σχολίων (αιτιολογημένων εκθέσεων, επιτροπών, κ.λπ.) που αφορούν "
    "το ίδιο άρθρο.\n"
    "Για **κάθε** σχόλιο, αποφάσισε αν το περιεχόμενό του **μπορεί να συνέβαλε** στη "
    "νομοτεχνική αλλαγή μεταξύ αρχικού και τελικού κειμένου (αιτιολόγηση, εντολή "
    "διαγραφής/προσθήκης/αναδιατύπωσης, πολιτική στόχευση).\n"
    "Χρησιμοποίησε μόνο τα `comment_id` ακριβώς όπως δόθηκαν. Η `contribution_likelihood` "
    "πρέπει να είναι μία από: none, low, medium, high.\n"
    "Γράψε `rationale_el` στα ελληνικά, σύντομα (1–3 προτάσεις)."
)

_LEGISLATIVE_COMMENT_ATTRIBUTION_HUMAN = (
    "{initial_block}\n\n{final_block}\n\nΣΧΟΛΙΑ:\n{comments_block}"
)

LEGISLATIVE_COMMENT_ATTRIBUTION_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", _LEGISLATIVE_COMMENT_ATTRIBUTION_SYSTEM),
        ("human", _LEGISLATIVE_COMMENT_ATTRIBUTION_HUMAN),
    ]
)
