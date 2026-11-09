# 제공자 확인 질문 초안 — 발송하지 않음

데이터 제공자는 [연구 문의 안내](https://seoulrestaurants.com/contact/)에서 방법론과 수치 확인 문의를 받는다고 밝히고 있다. 아래는 불확실성을 해소하기 위한 초안이다. 답변을 받기 전에는 해당 항목을 확인된 사실로 취급하지 않는다.

Subject: Questions about the August 2026 Seoul Restaurants open dataset

Hello,

I am working on an independent, non-commercial exploratory article about how restaurant ratings and review counts differ across platforms. Thank you for making your data and methodology available. I am reviewing the August 2026 JSON and CSV exports and would appreciate clarification on a few points before publishing any findings:

1. How exactly is `naver_visitor_score` obtained and defined? Does it correspond to Naver's currently displayed average star rating, a historical rating, or another derived measure? What evaluation periods are included?
2. Does `naver_visitor_reviews` count only reviews that contribute a numeric star rating, or all visitor reviews? What do the values `0` and `0.5` in `naver_visitor_score` represent?
3. Does `kakao_rating_count` count numeric ratings, written reviews, or another measure?
4. What does each record's `verified` date indicate? Were all platform scores and counts collected on the same date, and can older observations persist in the export?
5. How is `naver_match_confidence` calculated and calibrated? Is there a way to identify the matched Naver and Google listings for an independent branch-level check?
6. The methodology currently says that Naver no longer displays star ratings, while Naver reports that average ratings became visible again in July 2026. Does the August dataset reflect that change?
7. Your site marks the dataset CC BY 4.0. Are you able to clarify which rights or contractual permissions you hold for the underlying platform data, and whether independently calculated aggregate charts can be published with attribution?

For clarity, I am not asking you to disclose private information, and I will describe any unresolved uncertainty in the article. Thank you for any details you can share.
