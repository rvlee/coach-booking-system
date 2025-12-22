export type Language = 'en' | 'zh-TW';

export interface Translations {
  dashboard: {
    welcome: string;
    subtitle: string;
    logout: string;
    slots: string;
    bookings: string;
    settings: string;
  };
  settings: {
    title: string;
    timezone: {
      label: string;
      description: string;
    };
    dailyLimit: {
      label: string;
      description: string;
      hint: string;
    };
    language: {
      label: string;
      description: string;
    };
    save: string;
    saving: string;
    saved: string;
    error: string;
    loading: string;
  };
  slots: {
    title: string;
    create: string;
    yourSlots: string;
    noSlots: string;
    bookingLink: string;
    loading: string;
    available: string;
    booked: string;
    edit: string;
    delete: string;
    save: string;
    cancel: string;
    saving: string;
  };
  bookings: {
    title: string;
    noBookings: string;
    sharedClass: string;
    willingToShare: string;
    email: string;
    phone: string;
    sessionTime: string;
    duration: string;
    notes: string;
  };
  createSlot: {
    title: string;
    connectGoogle: string;
    googleConnected: string;
    refreshBusy: string;
    refreshing: string;
    createAll: string;
    creating: string;
    slotsReady: string;
    enableDays: string;
  };
  bookingPage: {
    title: string;
    selectSlot: string;
    noSlots: string;
    alreadyBooked: string;
    fullName: string;
    email: string;
    phone: string;
    notes: string;
    willingToShare: string;
    willingToShareHint: string;
    confirm: string;
    booking: string;
    confirmed: string;
    details: string;
    name: string;
    time: string;
    type: string;
    loading: string;
    slotNotAvailable: string;
    confirmationMessage: string;
    duration: string;
    minutes: string;
    selectDate: string;
    availableTimes: string;
    selectDateMessage: string;
    noSlotsForDate: string;
    sharedFriendly: string;
    spotsTaken: string;
    with: string;
    allSlotsBooked: string;
    checkBackLater: string;
    contactCoach: string;
    sessionDetails: string;
    dateTime: string;
  };
  login: {
    title: string;
    subtitle: string;
    signInWithGoogle: string;
    connecting: string;
    note: string;
    loading: string;
  };
  bookingsList: {
    thisMonth: string;
    noBookings: string;
    noBookingsMonth: string;
    allBookings: string;
    booking: string;
    bookings: string;
    cancel: string;
    cancelling: string;
    cancelConfirm: string;
    cancelError: string;
    sharedWith: string;
    timeTBD: string;
  };
  slotsList: {
    yourSlots: string;
    noSlots: string;
    startDate: string;
    startTime: string;
    endTime: string;
    duration: string;
    save: string;
    cancel: string;
    saving: string;
    available: string;
    booked: string;
    copy: string;
    noBookingLink: string;
  };
  calendar: {
    selectDate: string;
    sun: string;
    mon: string;
    tue: string;
    wed: string;
    thu: string;
    fri: string;
    sat: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    dashboard: {
      welcome: 'Welcome',
      subtitle: 'Manage your booking slots',
      logout: 'Logout',
      slots: 'Slots',
      bookings: 'Bookings',
      settings: 'Settings'
    },
    settings: {
      title: 'Settings',
      timezone: {
        label: 'Timezone',
        description: 'Set your timezone to ensure slots are created and displayed in your local time.'
      },
      dailyLimit: {
        label: 'Maximum bookings per day',
        description: 'Set the maximum number of bookings allowed per day. Once reached, no more bookings will be accepted for that day. Leave empty for no limit.',
        hint: 'Leave empty to allow unlimited bookings per day'
      },
      language: {
        label: 'Language',
        description: 'Choose your preferred language for the interface.'
      },
      save: 'Save Settings',
      saving: 'Saving...',
      saved: 'Settings saved successfully!',
      error: 'Failed to save settings',
      loading: 'Loading settings...'
    },
    slots: {
      title: 'Your Slots',
      create: 'Create Slots',
      yourSlots: 'Your Slots',
      noSlots: 'No slots created yet. Create your first slot above!',
      bookingLink: 'Your Booking Link:',
      loading: 'Loading booking link...',
      available: 'Available',
      booked: 'Booked',
      edit: 'Edit slot',
      delete: 'Delete slot',
      save: 'Save',
      cancel: 'Cancel',
      saving: 'Saving...'
    },
    bookings: {
      title: 'All Bookings',
      noBookings: 'No bookings yet. Share your booking links with clients!',
      sharedClass: 'Shared Class',
      willingToShare: 'Willing to Share',
      email: 'Email',
      phone: 'Phone',
      sessionTime: 'Session Time',
      duration: 'Duration',
      notes: 'Notes'
    },
    createSlot: {
      title: 'Create Slots',
      connectGoogle: 'Connect Google Calendar',
      googleConnected: 'Google Calendar connected',
      refreshBusy: 'Refresh busy',
      refreshing: 'Refreshing...',
      createAll: 'Create All Slots',
      creating: 'Creating...',
      slotsReady: 'slot(s) ready',
      enableDays: 'Enable days and configure times above'
    },
    bookingPage: {
      title: 'Book Your Session',
      selectSlot: 'Select a Time Slot',
      noSlots: 'No available slots',
      alreadyBooked: 'This slot is already booked',
      fullName: 'Full Name *',
      email: 'Email *',
      phone: 'Phone Number',
      notes: 'Notes (Optional)',
      willingToShare: "I'm willing to share this class with someone else",
      willingToShareHint: 'If checked, you may be paired with another participant. If paired, the session will be extended to 90 minutes.',
      confirm: 'Confirm Booking',
      booking: 'Booking...',
      confirmed: 'Booking Confirmed!',
      details: 'Booking Details',
      name: 'Name:',
      time: 'Time:',
      type: 'Type:',
      loading: 'Loading...',
      slotNotAvailable: 'Slot Not Available',
      confirmationMessage: 'Your booking has been confirmed. You will receive a confirmation email shortly.',
      duration: 'Duration:',
      minutes: 'minutes',
      selectDate: 'Select a Date',
      availableTimes: 'Available Times for',
      selectDateMessage: 'Please select a date from the calendar above to view available time slots.',
      noSlotsForDate: 'No available time slots for this date. Please select another date.',
      sharedFriendly: 'Shared-friendly',
      spotsTaken: 'spots taken',
      with: 'with',
      allSlotsBooked: 'All slots have been booked.',
      checkBackLater: 'Please check back later.',
      contactCoach: 'Please contact the coach for alternative times.',
      sessionDetails: 'Session Details',
      dateTime: 'Date & Time'
    },
    login: {
      title: 'Coach Booking System',
      subtitle: 'Sign in with Google to continue',
      signInWithGoogle: 'Sign in with Google',
      connecting: 'Connecting...',
      note: "By signing in, you'll be automatically registered if you don't have an account yet.",
      loading: 'Loading...'
    },
    bookingsList: {
      thisMonth: 'Bookings This Month',
      noBookings: 'No bookings yet. Share your booking links with clients!',
      noBookingsMonth: 'No bookings yet this month.',
      allBookings: 'All Bookings',
      booking: 'booking',
      bookings: 'bookings',
      cancel: 'Cancel',
      cancelling: 'Cancelling...',
      cancelConfirm: 'Are you sure you want to cancel this booking?',
      cancelError: 'Failed to cancel booking',
      sharedWith: 'Shared with:',
      timeTBD: 'Time TBD'
    },
    slotsList: {
      yourSlots: 'Your Slots',
      noSlots: 'No slots created yet. Create your first slot above!',
      startDate: 'Start Date',
      startTime: 'Start Time',
      endTime: 'End Time',
      duration: 'Duration (minutes)',
      save: 'Save',
      cancel: 'Cancel',
      saving: 'Saving...',
      available: 'Available',
      booked: 'Booked',
      copy: 'Copy',
      noBookingLink: 'No booking link available'
    },
    calendar: {
      selectDate: 'Select a Date',
      sun: 'Sun',
      mon: 'Mon',
      tue: 'Tue',
      wed: 'Wed',
      thu: 'Thu',
      fri: 'Fri',
      sat: 'Sat'
    }
  },
  'zh-TW': {
    dashboard: {
      welcome: '歡迎',
      subtitle: '管理您的預約時段',
      logout: '登出',
      slots: '時段',
      bookings: '預約',
      settings: '設定'
    },
    settings: {
      title: '設定',
      timezone: {
        label: '時區',
        description: '設定您的時區，確保時段以您的本地時間建立和顯示。'
      },
      dailyLimit: {
        label: '每日最大預約數',
        description: '設定每日允許的最大預約數量。達到上限後，當天將不再接受預約。留空表示無限制。',
        hint: '留空以允許每日無限制預約'
      },
      language: {
        label: '語言',
        description: '選擇您偏好的介面語言。'
      },
      save: '儲存設定',
      saving: '儲存中...',
      saved: '設定已成功儲存！',
      error: '儲存設定失敗',
      loading: '載入設定中...'
    },
    slots: {
      title: '您的時段',
      create: '建立時段',
      yourSlots: '您的時段',
      noSlots: '尚未建立時段。請在上方建立您的第一個時段！',
      bookingLink: '您的預約連結：',
      loading: '載入預約連結中...',
      available: '可預約',
      booked: '已預約',
      edit: '編輯時段',
      delete: '刪除時段',
      save: '儲存',
      cancel: '取消',
      saving: '儲存中...'
    },
    bookings: {
      title: '所有預約',
      noBookings: '尚無預約。與客戶分享您的預約連結！',
      sharedClass: '共享課程',
      willingToShare: '願意共享',
      email: '電子郵件',
      phone: '電話',
      sessionTime: '課程時間',
      duration: '時長',
      notes: '備註'
    },
    createSlot: {
      title: '建立時段',
      connectGoogle: '連接 Google 日曆',
      googleConnected: 'Google 日曆已連接',
      refreshBusy: '重新整理忙碌時間',
      refreshing: '重新整理中...',
      createAll: '建立所有時段',
      creating: '建立中...',
      slotsReady: '個時段已準備就緒',
      enableDays: '請在上方啟用日期並設定時間'
    },
    bookingPage: {
      title: '預約您的課程',
      selectSlot: '選擇時段',
      noSlots: '無可用時段',
      alreadyBooked: '此時段已被預約',
      fullName: '全名 *',
      email: '電子郵件 *',
      phone: '電話號碼',
      notes: '備註（選填）',
      willingToShare: '我願意與他人共享此課程',
      willingToShareHint: '如果勾選，您可能會與另一位參與者配對。如果配對成功，課程將延長至 90 分鐘。',
      confirm: '確認預約',
      booking: '預約中...',
      confirmed: '預約已確認！',
      details: '預約詳情',
      name: '姓名：',
      time: '時間：',
      type: '類型：',
      loading: '載入中...',
      slotNotAvailable: '時段不可用',
      confirmationMessage: '您的預約已確認。您將很快收到確認電子郵件。',
      duration: '時長：',
      minutes: '分鐘',
      selectDate: '選擇日期',
      availableTimes: '可用時間',
      selectDateMessage: '請從上方日曆選擇日期以查看可用時段。',
      noSlotsForDate: '此日期無可用時段。請選擇其他日期。',
      sharedFriendly: '可共享',
      spotsTaken: '個位置已預約',
      with: '與',
      allSlotsBooked: '所有時段已被預約。',
      checkBackLater: '請稍後再查看。',
      contactCoach: '請聯繫教練以獲取其他時間。',
      sessionDetails: '課程詳情',
      dateTime: '日期與時間'
    },
    login: {
      title: '教練預約系統',
      subtitle: '使用 Google 登入以繼續',
      signInWithGoogle: '使用 Google 登入',
      connecting: '連接中...',
      note: '登入後，如果您還沒有帳戶，系統將自動為您註冊。',
      loading: '載入中...'
    },
    bookingsList: {
      thisMonth: '本月預約',
      noBookings: '尚無預約。與客戶分享您的預約連結！',
      noBookingsMonth: '本月尚無預約。',
      allBookings: '所有預約',
      booking: '個預約',
      bookings: '個預約',
      cancel: '取消',
      cancelling: '取消中...',
      cancelConfirm: '您確定要取消此預約嗎？',
      cancelError: '取消預約失敗',
      sharedWith: '共享對象：',
      timeTBD: '時間待定'
    },
    slotsList: {
      yourSlots: '您的時段',
      noSlots: '尚未建立時段。請在上方建立您的第一個時段！',
      startDate: '開始日期',
      startTime: '開始時間',
      endTime: '結束時間',
      duration: '時長（分鐘）',
      save: '儲存',
      cancel: '取消',
      saving: '儲存中...',
      available: '可預約',
      booked: '已預約',
      copy: '複製',
      noBookingLink: '無可用預約連結'
    },
    calendar: {
      selectDate: '選擇日期',
      sun: '日',
      mon: '一',
      tue: '二',
      wed: '三',
      thu: '四',
      fri: '五',
      sat: '六'
    }
  }
};




