'use client';

import { useEffect, useState } from 'react';
import { useAuthSession } from '@/features/auth';
import {
  changePassword,
  updateProfile,
  withdraw,
} from '@/features/auth/api/auth.api';
import type { UpdateProfilePayload } from '@/features/auth/model/types';
import { buildDashboardMenus, DashboardShell } from '@/features/dashboard';
import { COUNTRY_OPTIONS } from '@/shared/constants';
import {
  PASSWORD_REQUIREMENT_TEXT,
  validatePassword,
} from '@/shared/utils/validate-password';
import {
  getPostalCodeInfo,
  validatePostalCode,
} from '@/shared/utils/postal-code';
import { useToast } from '@/shared/ui/toast/toast-provider';

/** 한국 휴대폰 010XXXXXXXX (10자리) → E.164 +8210XXXXXXXX 변환 */
function normalizePhoneE164(phone: string, countryCode?: string | null): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (countryCode === 'KR' && digits.startsWith('010') && digits.length >= 10) {
    return `+82${digits.slice(1)}`;
  }
  if (digits.startsWith('82') && digits.length >= 10) return `+${digits}`;
  if (phone.trim().startsWith('+')) return phone.trim();
  return phone.trim();
}

export default function AccountPage() {
  const {
    me,
    devices,
    maxActiveDevices,
    loggingOut,
    loadingDevices,
    deviceActionId,
    loggingOutOthers,
    signOut,
    revokeDevice,
    signOutOthers,
    refreshMe,
  } = useAuthSession();
  const [withdrawConfirm, setWithdrawConfirm] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const { showToast } = useToast();

  const [profileName, setProfileName] = useState(me?.name ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(me?.dateOfBirth ?? '');
  const [phone, setPhone] = useState(me?.phone ?? '');
  const [addressLine1, setAddressLine1] = useState(me?.addressLine1 ?? '');
  const [addressLine2, setAddressLine2] = useState(me?.addressLine2 ?? '');
  const [city, setCity] = useState(me?.city ?? '');
  const [stateProvince, setStateProvince] = useState(me?.stateProvince ?? '');
  const [postalCode, setPostalCode] = useState(me?.postalCode ?? '');
  const [countryCode, setCountryCode] = useState(me?.countryCode ?? '');
  const [profileImageUrl, setProfileImageUrl] = useState(me?.profileImageUrl ?? '');
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  useEffect(() => {
    if (!me) return;
    setProfileName(me.name ?? '');
    setDateOfBirth(me.dateOfBirth ?? '');
    setPhone(me.phone ?? '');
    setAddressLine1(me.addressLine1 ?? '');
    setAddressLine2(me.addressLine2 ?? '');
    setCity(me.city ?? '');
    setStateProvince(me.stateProvince ?? '');
    setPostalCode(me.postalCode ?? '');
    setCountryCode(me.countryCode ?? '');
    setProfileImageUrl(me.profileImageUrl ?? '');
  }, [me]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const inputClass =
    'h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200';
  const labelClass = 'block text-sm font-medium text-slate-700';
  const btnPrimary =
    'h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50';

  function buildProfilePayload(): UpdateProfilePayload {
    const normalizedPhone = phone.trim()
      ? normalizePhoneE164(phone, countryCode || 'KR')
      : null;
    return {
      name: profileName.trim(),
      dateOfBirth: dateOfBirth.trim() || null,
      phone: normalizedPhone,
      addressLine1: addressLine1.trim() || null,
      addressLine2: addressLine2.trim() || null,
      city: city.trim() || null,
      stateProvince: stateProvince.trim() || null,
      postalCode: postalCode.trim() || null,
      countryCode: countryCode.trim() ? countryCode : null,
      profileImageUrl: profileImageUrl.trim() || null,
    };
  }

  function hasProfileChanges(): boolean {
    const p = buildProfilePayload();
    if (p.name !== (me?.name ?? '')) return true;
    if ((p.dateOfBirth ?? null) !== (me?.dateOfBirth ?? null)) return true;
    if ((p.phone ?? null) !== (me?.phone ?? null)) return true;
    if ((p.addressLine1 ?? null) !== (me?.addressLine1 ?? null)) return true;
    if ((p.addressLine2 ?? null) !== (me?.addressLine2 ?? null)) return true;
    if ((p.city ?? null) !== (me?.city ?? null)) return true;
    if ((p.stateProvince ?? null) !== (me?.stateProvince ?? null)) return true;
    if ((p.postalCode ?? null) !== (me?.postalCode ?? null)) return true;
    if ((p.countryCode ?? null) !== (me?.countryCode ?? null)) return true;
    if ((p.profileImageUrl ?? null) !== (me?.profileImageUrl ?? null)) return true;
    return false;
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!me || profileSubmitting || !profileName.trim()) return;
    const pcValidation = validatePostalCode(postalCode ?? '', countryCode);
    if (!pcValidation.valid) {
      showToast(pcValidation.message ?? '올바른 형식이 아닙니다.', 'error');
      return;
    }
    setProfileSubmitting(true);
    try {
      await updateProfile(buildProfilePayload());
      await refreshMe();
      showToast('회원정보가 수정되었습니다.', 'success');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } })
              .response?.data?.message
          : null;
      const message = Array.isArray(msg) ? msg[0] : msg;
      showToast(message ?? '회원정보 수정에 실패했습니다.', 'error');
    } finally {
      setProfileSubmitting(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passwordSubmitting || !currentPassword || !newPassword) return;
    const pwResult = validatePassword(newPassword);
    if (!pwResult.valid) {
      showToast(pwResult.message, 'error');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      showToast('새 비밀번호가 일치하지 않습니다.', 'error');
      return;
    }
    setPasswordSubmitting(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
      showToast('비밀번호가 변경되었습니다.', 'success');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : null;
      showToast(msg ?? '비밀번호 변경에 실패했습니다.', 'error');
    } finally {
      setPasswordSubmitting(false);
    }
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    if (!withdrawConfirm || withdrawing) return;
    setWithdrawing(true);
    try {
      await withdraw();
      showToast('회원 탈퇴가 완료되었습니다.', 'success');
      await signOut();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : null;
      showToast(msg ?? '회원 탈퇴에 실패했습니다.', 'error');
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <DashboardShell
      userName={me?.name ?? '사용자'}
      companyName={me?.companyName ?? '회사'}
      onLogout={signOut}
      loggingOut={loggingOut}
      menus={buildDashboardMenus(me?.role)}
    >
      {me && (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700">
              회원정보 수정
            </h2>
            <form
              onSubmit={handleProfileSubmit}
              className="mt-3 space-y-3"
            >
              {/* 프로필 사진 */}
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                  {profileImageUrl ? (
                    <img
                      src={profileImageUrl}
                      alt="프로필"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl text-slate-400">
                      {profileName.charAt(0) || '?'}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="account-profile-image" className={labelClass}>
                    프로필 이미지 URL
                  </label>
                  <input
                    id="account-profile-image"
                    type="url"
                    className={inputClass}
                    value={profileImageUrl}
                    onChange={(e) => setProfileImageUrl(e.target.value)}
                    disabled={profileSubmitting}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label htmlFor="account-name" className={labelClass}>
                  이름
                </label>
                <input
                  id="account-name"
                  type="text"
                  className={inputClass}
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  disabled={profileSubmitting}
                  autoComplete="name"
                  maxLength={100}
                />
              </div>

              <div>
                <label htmlFor="account-dob" className={labelClass}>
                  생년월일
                </label>
                <input
                  id="account-dob"
                  type="date"
                  className={inputClass}
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  disabled={profileSubmitting}
                  autoComplete="bday"
                />
              </div>

              <div>
                <label htmlFor="account-phone" className={labelClass}>
                  휴대폰 번호 (E.164)
                </label>
                <input
                  id="account-phone"
                  type="tel"
                  className={inputClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={profileSubmitting}
                  placeholder="+821012345678 또는 010-1234-5678"
                  autoComplete="tel"
                />
                <p className="mt-1 text-xs text-slate-500">
                  예: +821012345678 (한국은 010 입력 시 자동 변환)
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                <p className="mb-2 text-xs font-medium text-slate-600">주소</p>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="account-country" className={labelClass}>
                      국가
                    </label>
                    <select
                      id="account-country"
                      className={inputClass}
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      disabled={profileSubmitting}
                      autoComplete="country-code"
                    >
                      {COUNTRY_OPTIONS.map((o) => (
                        <option key={o.value || 'empty'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="account-address1" className={labelClass}>
                      주소 1
                    </label>
                    <input
                      id="account-address1"
                      type="text"
                      className={inputClass}
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      disabled={profileSubmitting}
                      placeholder="도로명, 지번 등"
                      autoComplete="address-line1"
                    />
                  </div>
                  <div>
                    <label htmlFor="account-address2" className={labelClass}>
                      주소 2 (상세)
                    </label>
                    <input
                      id="account-address2"
                      type="text"
                      className={inputClass}
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      disabled={profileSubmitting}
                      placeholder="동/층/호 등"
                      autoComplete="address-line2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="sm:col-span-2">
                      <label htmlFor="account-city" className={labelClass}>
                        시/도
                      </label>
                      <input
                        id="account-city"
                        type="text"
                        className={inputClass}
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        disabled={profileSubmitting}
                        autoComplete="address-level2"
                      />
                    </div>
                    <div>
                      <label htmlFor="account-state" className={labelClass}>
                        구/군
                      </label>
                      <input
                        id="account-state"
                        type="text"
                        className={inputClass}
                        value={stateProvince}
                        onChange={(e) => setStateProvince(e.target.value)}
                        disabled={profileSubmitting}
                        autoComplete="address-level1"
                      />
                    </div>
                    <div>
                      <label htmlFor="account-postal" className={labelClass}>
                        우편번호
                      </label>
                      <input
                        id="account-postal"
                        type="text"
                        className={inputClass}
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        disabled={profileSubmitting}
                        placeholder={
                          getPostalCodeInfo(countryCode)?.example ?? '06134'
                        }
                        autoComplete="postal-code"
                      />
                      {countryCode && getPostalCodeInfo(countryCode) && (
                        <p className="mt-1 text-xs text-slate-500">
                          {getPostalCodeInfo(countryCode)!.hint}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>이메일: {me.email}</span>
                <span>·</span>
                <span>역할: {me.role}</span>
              </div>

              <button
                type="submit"
                disabled={profileSubmitting || !hasProfileChanges()}
                className={btnPrimary}
              >
                {profileSubmitting ? '저장 중...' : '저장'}
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700">
              비밀번호 변경
            </h2>
            <form
              onSubmit={handlePasswordSubmit}
              className="mt-3 space-y-3"
            >
              <div>
                <label htmlFor="current-password" className={labelClass}>
                  현재 비밀번호
                </label>
                <input
                  id="current-password"
                  type="password"
                  className={inputClass}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={passwordSubmitting}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label htmlFor="new-password" className={labelClass}>
                  새 비밀번호 ({PASSWORD_REQUIREMENT_TEXT})
                </label>
                <input
                  id="new-password"
                  type="password"
                  className={inputClass}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passwordSubmitting}
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <div>
                <label htmlFor="new-password-confirm" className={labelClass}>
                  새 비밀번호 확인
                </label>
                <input
                  id="new-password-confirm"
                  type="password"
                  className={inputClass}
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  disabled={passwordSubmitting}
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                disabled={
                  passwordSubmitting ||
                  !currentPassword ||
                  !newPassword ||
                  !newPasswordConfirm
                }
                className={btnPrimary}
              >
                {passwordSubmitting ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700">회원 탈퇴</h2>
            <p className="mt-1 text-xs text-slate-500">
              탈퇴 시 계정이 비활성화되고 모든 세션에서 로그아웃됩니다. 재가입 후
              관리자 승인이 필요합니다.
            </p>
            <form onSubmit={handleWithdraw} className="mt-3 space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={withdrawConfirm}
                  onChange={(e) => setWithdrawConfirm(e.target.checked)}
                  disabled={withdrawing}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">
                  탈퇴를 확인합니다. 위 내용을 이해했으며 진행합니다.
                </span>
              </label>
              <button
                type="submit"
                disabled={!withdrawConfirm || withdrawing}
                className="h-9 rounded-lg border border-red-300 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {withdrawing ? '처리 중...' : '회원 탈퇴'}
              </button>
            </form>
          </section>
        </>
      )}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">
              로그인된 디바이스
            </h2>
            <p className="text-xs text-slate-500">
              현재 {devices.length} / 최대 {maxActiveDevices} 대
            </p>
          </div>
          <button
            type="button"
            onClick={signOutOthers}
            disabled={loggingOutOthers || devices.length <= 1}
            className="h-9 rounded-lg border border-slate-300 px-3 text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loggingOutOthers ? '처리 중...' : '다른 디바이스 로그아웃'}
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {loadingDevices && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              디바이스 목록을 불러오는 중...
            </p>
          )}
          {!loadingDevices && devices.length === 0 && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              활성 디바이스 세션이 없습니다.
            </p>
          )}
          {!loadingDevices &&
            devices.map((device) => (
              <div
                key={device.id}
                className="rounded-lg border border-slate-200 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-800">
                    {device.deviceName ?? '알 수 없는 디바이스'}
                  </p>
                  <div className="flex items-center gap-2">
                    {device.isCurrent && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                        현재 디바이스
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={device.isCurrent || deviceActionId === device.id}
                      onClick={() => revokeDevice(device.id)}
                      className="h-8 rounded-md border border-slate-300 px-2 text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deviceActionId === device.id ? '처리 중...' : '로그아웃'}
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  IP: {device.ip ?? '-'} / 만료:{' '}
                  {new Date(device.expiresAt).toLocaleString()}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  UA: {device.userAgent ?? '-'}
                </p>
              </div>
            ))}
        </div>
      </section>
    </DashboardShell>
  );
}
