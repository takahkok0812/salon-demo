/**
 * 日付の計算をどの環境でも同じにするため、タイムゾーンを日本時間に固定する。
 * ただし TZ が指定されていればそれを使う（npm run test:utc で、UTC で動く本番環境と同じ条件を確かめる）。
 */
export default function setup() {
  process.env.TZ ||= 'Asia/Tokyo';
}
